// ! WARNING: this module cannot depend on modules not ending with ".hoot" (except libs) !

import { describe, dryRun, globals, start, stop } from "@odoo/hoot";
import { Deferred, watchKeys, watchListeners } from "@odoo/hoot-mock";
import { whenReady } from "@odoo/owl";

import { mockBrowserFactory } from "./mock_browser.hoot";
import { mockCurrencyFactory } from "./mock_currency.hoot";
import { TEST_SUFFIX } from "./mock_module_loader";
import { mockSessionFactory } from "./mock_session.hoot";
import { makeTemplateFactory } from "./mock_templates.hoot";
import { mockUserFactory } from "./mock_user.hoot";

/**
 * @typedef {typeof loader} ModuleLoader
 *
 * @typedef {{
 *  filter?: (path: string) => boolean;
 *  moduleNames: string[];
 * }} ModuleSet
 *
 * @typedef {{
 *  addons?: Iterable<string>;
 * }} ModuleSetParams
 */

const { fetch: realFetch } = globals;
const { define, loader } = odoo;

//-----------------------------------------------------------------------------
// Internal
//-----------------------------------------------------------------------------

/**
 * Used for debugging purposes.
 *
 * @param {Suite} suite
 */
const logMemory = (suite) => {
    if (typeof window.gc !== "function") {
        return;
    }

    // Cleanup last retained textarea
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.value = "aaa";
    textarea.focus();
    textarea.remove();

    // Run garbage collection
    window.gc();

    // Log memory usage
    console.log(
        `[MEMINFO] ${suite.fullName} - after gc: ${window.performance.memory.usedJSHeapSize} - tests: ${suite.reporting.tests}`
    );
};

/**
 * @param {string[]} entryPoints
 * @param {Set<string>} additionalAddons
 */
const defineModuleSet = async (entryPoints, additionalAddons) => {
    for (const name of entryPoints) {
        if (additionalAddons.has("*")) {
            break;
        }
        if (moduleSetParams[name]?.addons) {
            for (const additionalAddon of moduleSetParams[name].addons) {
                additionalAddons.add(additionalAddon);
            }
        }
    }

    /** @type {ModuleSet} */
    const moduleSet = {};
    if (additionalAddons.has("*")) {
        // Use all addons
        moduleSet.moduleNames = sortedModuleNames.filter((name) => !name.endsWith(TEST_SUFFIX));
    } else {
        // Use subset of addons
        for (const entryPoint of entryPoints) {
            additionalAddons.add(getAddonName(entryPoint));
        }
        const addons = await fetchDependencies(additionalAddons);
        const joinedAddons = [...addons].sort().join(",");
        const filter = (path) => joinedAddons.includes(getAddonName(path));
        // Module names are cached for each configuration of addons
        if (!moduleNamesCache.has(joinedAddons)) {
            moduleNamesCache.set(
                joinedAddons,
                sortedModuleNames.filter((name) => !name.endsWith(TEST_SUFFIX) && filter(name))
            );
        }
        moduleSet.filter = filter;
        moduleSet.moduleNames = moduleNamesCache.get(joinedAddons);
    }

    return moduleSet;
};

/**
 * @param {string[]} entryPoints
 */
const describeDrySuite = async (entryPoints) => {
    const moduleSet = await defineModuleSet(entryPoints, new Set(["*"]));
    const moduleSetLoader = new ModuleSetLoader(moduleSet);

    moduleSetLoader.setup();

    for (const entryPoint of entryPoints) {
        // Run test factory
        describe(getSuitePath(entryPoint), () => {
            currentModule = entryPoint;
            // Load entry point module
            moduleSetLoader.startModule(entryPoint + TEST_SUFFIX);
            currentModule = null;
        });
    }

    moduleSetLoader.cleanup();
};

/**
 * @param {Set<string>} addons
 */
const fetchDependencies = async (addons) => {
    // Fetch missing dependencies
    const addonsToFetch = [];
    for (const addon of addons) {
        if (!dependencyCache[addon] && !DEFAULT_ADDONS.includes(addon)) {
            addonsToFetch.push(addon);
            dependencyCache[addon] = new Deferred();
        }
    }
    if (addonsToFetch.length) {
        if (!dependencyBatch.length) {
            dependencyBatchPromise = new Promise(setTimeout).then(() => {
                const module_names = [...new Set(dependencyBatch)];
                dependencyBatch = [];
                return orm("ir.module.module.dependency", "all_dependencies", [], { module_names });
            });
        }
        dependencyBatch.push(...addonsToFetch);
        dependencyBatchPromise.then((allDependencies) => {
            for (const [moduleName, dependencyNames] of Object.entries(allDependencies)) {
                dependencyCache[moduleName] ||= new Deferred();
                dependencyCache[moduleName].resolve();

                dependencies[moduleName] = dependencyNames.filter(
                    (dep) => !DEFAULT_ADDONS.includes(dep)
                );
            }

            resolveAddonDependencies(dependencies);
        });
    }

    await Promise.all([...addons].map((addon) => dependencyCache[addon]));

    return getDependencies(addons);
};

/**
 * @param {string} name
 */
const findMockFactory = (name) => {
    if (MODULE_MOCKS_BY_NAME.has(name)) {
        return MODULE_MOCKS_BY_NAME.get(name);
    }
    for (const [key, factory] of MODULE_MOCKS_BY_REGEX) {
        if (key instanceof RegExp && key.test(name)) {
            return factory;
        }
    }
    return null;
};

/**
 * @param {string} name
 */
const getAddonName = (name) => name.match(R_PATH_ADDON)?.[1];

/**
 * @param {Iterable<string>} addons
 */
const getDependencies = (addons) => {
    const result = new Set(DEFAULT_ADDONS);
    for (const addon of addons) {
        if (DEFAULT_ADDONS.includes(addon)) {
            continue;
        }
        result.add(addon);
        for (const dep of dependencies[addon]) {
            result.add(dep);
        }
    }
    return result;
};

/**
 * @param {string} name
 */
const getSuitePath = (name) => name.replace("../tests/", "");

/**
 * Keeps the original definition of a factory.
 *
 * @param {string} name
 */
const makeFixedFactory = (name) => {
    return () => {
        if (!loader.modules.has(name)) {
            loader.startModule(name);
        }
        return loader.modules.get(name);
    };
};

/**
 * Toned-down version of the RPC + ORM features since this file cannot depend on
 * them.
 *
 * @param {string} model
 * @param {string} method
 * @param {any[]} args
 * @param {Record<string, any>} kwargs
 */
const orm = async (model, method, args, kwargs) => {
    const response = await realFetch(`/web/dataset/call_kw/${model}/${method}`, {
        body: JSON.stringify({
            id: nextRpcId++,
            jsonrpc: "2.0",
            method: "call",
            params: { args, kwargs, method, model },
        }),
        headers: {
            "Content-Type": "application/json",
        },
        method: "POST",
    });
    const { error, result } = await response.json();
    if (error) {
        throw error;
    }
    return result;
};

/**
 * @template {Record<string, string[]>} T
 * @param {T} dependencies
 */
const resolveAddonDependencies = (dependencies) => {
    const findJob = () =>
        Object.entries(remaining).find(([, deps]) => deps.every((dep) => dep in solved));

    const remaining = { ...dependencies };
    /** @type {T} */
    const solved = {};

    let entry;
    while ((entry = findJob())) {
        const [name, deps] = entry;
        solved[name] = [...new Set(deps.flatMap((dep) => [dep, ...solved[dep]]))];
        delete remaining[name];
    }

    const remainingKeys = Object.keys(remaining);
    if (remainingKeys.length) {
        throw new Error(`Unresolved dependencies: ${remainingKeys.join(", ")}`);
    }

    Object.assign(dependencies, solved);
};

const runTests = async () => {
    // Sort modules to accelerate loading time
    /** @type {Record<string, Deferred>} */
    const defs = {};
    /** @type {Map<string, string[]>} */
    const nonLoaded = new Map();
    /** @type {string[]} */
    const testModuleNames = [];
    for (const [name, { deps }] of loader.factories) {
        // Register test module
        if (name.endsWith(TEST_SUFFIX)) {
            const baseName = name.slice(0, -TEST_SUFFIX.length);
            testModuleNames.push(baseName);
        }

        // Register module dependencies
        nonLoaded.set(name, deps);
        const [modDef, ...depDefs] = [name, ...deps].map((dep) => (defs[dep] ||= new Deferred()));
        Promise.all(depDefs).then(() => {
            sortedModuleNames.push(name);
            modDef.resolve();
            nonLoaded.delete(name);
        });
    }

    let timeout;
    await Promise.race([
        Promise.all(Object.values(defs)),
        new Promise((resolve, reject) => {
            timeout = setTimeout(
                () =>
                    reject(
                        [
                            `Missing dependencies:`,
                            ...new Set(
                                [...nonLoaded].flatMap(([name, deps]) =>
                                    deps.filter((d) => !sortedModuleNames.includes(d))
                                )
                            ),
                        ].join("\n")
                    ),
                1000
            );
        }),
    ]);
    clearTimeout(timeout);

    // Dry run
    const [{ suites }] = await Promise.all([
        dryRun(() => describeDrySuite(testModuleNames)),
        whenReady(),
    ]);

    // Run all test files
    const suitePaths = suites.map((s) => s.fullName);
    for (const moduleName of testModuleNames) {
        if (suitePaths.includes(getSuitePath(moduleName))) {
            const moduleSet = await defineModuleSet([moduleName], new Set());
            const moduleSetLoader = new ModuleSetLoader(moduleSet);

            const suite = describe(getSuitePath(moduleName), () => {
                const fullName = moduleName + TEST_SUFFIX;
                moduleSetLoader.setup();
                moduleSetLoader.startModule(fullName);
                const module = moduleSetLoader.modules.get(fullName);
                const exports = Object.keys(module);
                if (exports.length) {
                    throw new Error(
                        `Test files cannot have exports, found the following exported member(s) in module ${fullName}:${exports
                            .map((name) => `\n - ${name}`)
                            .join("")}`
                    );
                }
            });

            // Run recently added tests
            const running = await start(suite);

            moduleSetLoader.cleanup();
            logMemory(suite);

            if (!running) {
                break;
            }
        }
    }

    await stop();
};

/** @extends {ModuleLoader} */
class ModuleSetLoader extends loader.constructor {
    cleanups = [];

    /**
     * @param {ModuleSet} moduleSet
     */
    constructor(moduleSet) {
        super();

        this.factories = new Map(loader.factories);
        this.modules = new Map(loader.modules);
        this.moduleSet = moduleSet;

        odoo.define = this.define.bind(this);
        odoo.loader = this;
    }

    get templateModule() {
        return this.modules.get("@web/core/templates");
    }

    cleanup() {
        if (this.templateModule) {
            this.templateModule.setUrlFilters([]);
            this.templateModule.clearProcessedTemplates();
        }

        odoo.define = define;
        odoo.loader = loader;

        while (this.cleanups.length) {
            this.cleanups.pop()();
        }
    }

    /**
     * @override
     * @type {typeof loader["define"]}
     */
    define(name, deps, factory) {
        if (!loader.factories.has(name)) {
            // Lazy-loaded modules are added to the main loader for next ModuleSetLoader
            // instances.
            loader.define(name, deps, factory, true);
            // We assume that lazy-loaded modules are not required by any other
            // module.
            sortedModuleNames.push(name);
            moduleNamesCache.clear();
        }
        return super.define(...arguments);
    }

    setup() {
        const { filter, moduleNames } = this.moduleSet;

        this.cleanups.push(
            watchKeys(window.odoo, WHITE_LISTED_KEYS),
            watchKeys(window, WHITE_LISTED_KEYS),
            watchListeners()
        );

        // Load module set modules (without entry point)
        for (const name of moduleNames) {
            const mockFactory = findMockFactory(name);
            if (mockFactory) {
                // Use mock
                this.factories.set(name, {
                    deps: [],
                    fn: mockFactory(name, this.factories.get(name)),
                });
            }
            if (!this.modules.has(name)) {
                // Run (or re-run) module factory
                this.startModule(name);
            }
        }

        // If templates module is available: set URL filter to filter out static
        // templates.
        if (filter) {
            this.templateModule?.setUrlFilters([filter]);
        }
    }

    /**
     * @override
     * @type {typeof loader["startModule"]}
     */
    startModule(name) {
        const { filter } = this.moduleSet;
        if (!filter || filter(name) || R_DEFAULT_MODULE.test(name)) {
            super.startModule(name);
        }
    }
}

const CSRF_TOKEN = odoo.csrf_token;
const DEFAULT_ADDONS = ["base", "web"];
const MODULE_MOCKS_BY_NAME = new Map([
    // Fixed modules
    ["@web/core/template_inheritance", makeFixedFactory],
    // Other mocks
    ["@web/core/browser/browser", mockBrowserFactory],
    ["@web/core/currency", mockCurrencyFactory],
    ["@web/core/templates", makeTemplateFactory],
    ["@web/core/user", mockUserFactory],
    ["@web/session", mockSessionFactory],
]);
const MODULE_MOCKS_BY_REGEX = new Map([
    // Fixed modules
    [/\.bundle\.xml$/, makeFixedFactory],
]);
const R_DEFAULT_MODULE = /^@odoo\/(owl|hoot)/;
const R_PATH_ADDON = /^[@/]?(\w+)/;
const WHITE_LISTED_KEYS = [
    "ace", // Ace editor
    "Chart", // Chart.js
    "L", // Leaflet
    "lamejs", // LameJS
];

/** @type {Record<string, string[]} */
const dependencies = {};
/** @type {Record<string, Deferred} */
const dependencyCache = {};
/** @type {Set<string>} */
const modelsToFetch = new Set();
/** @type {Map<string, string[]>} */
const moduleNamesCache = new Map();
/** @type {Record<string, ModuleSetParams>} */
const moduleSetParams = {};
/** @type {Map<string, Record<string, any>>} */
const serverModelCache = new Map();
/** @type {string[]} */
const sortedModuleNames = [];

/** @type {string | null} */
let currentModule = null;
/** @type {string[]} */
let dependencyBatch = [];
/** @type {Promise<Record<string, string[]>> | null} */
let dependencyBatchPromise = null;
let nextRpcId = 1e9;

// Patch `console.warn` to throw errors instead of log warnings.
// This is done because warnings make runbot builds fail, and we want to be noticed
// as soon as possible.
const originalWarn = console.warn;
console.warn = function throwInsteadOfWarn(...args) {
    const message = args.join(" ");
    if (message.includes("[HOOT]")) {
        originalWarn(...args);
    } else {
        throw new Error(message);
    }
};

// Invoke tests after the module loader finished loading.
setTimeout(runTests);

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * @param {ModuleSetParams} params
 */
export function configureModuleSet(params) {
    if (!currentModule) {
        return;
    }
    moduleSetParams[currentModule] ||= {};
    Object.assign(moduleSetParams[currentModule], params);
}

export function clearServerModelCache() {
    serverModelCache.clear();
}

/**
 * @param {Iterable<string>} modelNames
 */
export async function fetchModelDefinitions(modelNames) {
    // Fetch missing definitions
    const namesList = [...modelsToFetch];
    if (namesList.length) {
        const formData = new FormData();
        formData.set("csrf_token", CSRF_TOKEN);
        formData.set("model_names", JSON.stringify(namesList));

        const response = await realFetch("/web/model/get_definitions", {
            body: formData,
            method: "POST",
        });
        if (!response.ok) {
            const [s, some, does] =
                namesList.length === 1 ? ["", "this", "does"] : ["s", "some or all of these", "do"];
            const message = `Could not fetch definition${s} for server model${s} "${namesList.join(
                `", "`
            )}": ${some} model${s} ${does} not exist`;
            throw new Error(message);
        }
        const modelDefs = await response.json();

        for (const [modelName, modelDef] of Object.entries(modelDefs)) {
            serverModelCache.set(modelName, modelDef);
            modelsToFetch.delete(modelName);
        }
    }

    return [...modelNames].map((modelName) => [modelName, serverModelCache.get(modelName)]);
}

/**
 * @param {string} modelName
 */
export function registerModelToFetch(modelName) {
    if (!serverModelCache.has(modelName)) {
        modelsToFetch.add(modelName);
    }
}
