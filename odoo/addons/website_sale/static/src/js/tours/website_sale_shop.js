/** @odoo-module **/

    import { _t } from "@web/core/l10n/translation";
    import wTourUtils from "@website/js/tours/tour_utils";

    import { markup } from "@odoo/owl";

    wTourUtils.registerWebsitePreviewTour("test_01_admin_shop_tour", {
        url: '/shop',
        sequence: 130,
    }, () => [{
        trigger: ".o_menu_systray .o_new_content_container > a",
        content: _t("Let's create your first product."),
        extra_trigger: ":iframe .js_sale",
        consumeVisibleOnly: true,
        position: "bottom",
        run: "click",
    }, {
        trigger: "a[data-module-xml-id='base.module_website_sale']",
        content: markup(_t("Select <b>New Product</b> to create it and manage its properties to boost your sales.")),
        position: "bottom",
        run: "click",
    }, {
        trigger: ".modal-dialog input[type=text]",
        content: _t("Enter a name for your new product"),
        position: "left",
        run: "edit Test",
    }, {
        trigger: ".modal-footer button.btn-primary",
        content: markup(_t("Click on <em>Save</em> to create the product.")),
        position: "right",
        run: "click",
    }, {
        trigger: ":iframe .product_price .oe_currency_value:visible",
        extra_trigger: "#oe_snippets.o_loaded",
        content: _t("Edit the price of this product by clicking on the amount."),
        position: "bottom",
        run: "editor 1.99",
        timeout: 30000,
    }, {
        trigger: ":iframe #wrap img.product_detail_img",
        extra_trigger: ":iframe .product_price .o_dirty .oe_currency_value:not(:contains(/^1.00$/))",
        content: _t("Double click here to set an image describing your product."),
        position: "top",
        run: "dblclick",
    }, {
        trigger: ".o_select_media_dialog .o_upload_media_button",
        content: _t("Upload a file from your local library."),
        position: "bottom",
        run: "click .modal-footer .btn-secondary",
        auto: true,
    },
    wTourUtils.goBackToBlocks(),
    {
        trigger: "#snippet_structure .oe_snippet:eq(3) .oe_snippet_thumbnail",
        extra_trigger: "body:not(.modal-open)",
        content: _t("Drag this website block and drop it in your page."),
        position: "bottom",
        run: "drag_and_drop :iframe #wrapwrap > main",
    }, {
        trigger: "button[data-action=save]",
        content: markup(_t("Once you click on <b>Save</b>, your product is updated.")),
        position: "bottom",
        run: "click",
        // Wait until the drag and drop is resolved (causing a history step)
        // before clicking save.
        extra_trigger: ".o_we_external_history_buttons button.fa-undo:not([disabled])",
    }, {
        trigger: ".o_menu_systray_item.o_website_publish_container a",
        extra_trigger: ":iframe body:not(.editor_enable)",
        content: _t("Click on this button so your customers can see it."),
        position: "bottom",
        run: "click",
    }, {
        trigger: "button[data-menu-xmlid='website.menu_reporting']",
        content: _t("Click here to open the reporting menu"),
        position: "bottom",
        run: "click",
    }, {
        trigger: "a[data-menu-xmlid='website.menu_website_dashboard'], a[data-menu-xmlid='website.menu_website_analytics']",
        content: _t("Let's now take a look at your eCommerce dashboard to get your eCommerce website ready in no time."),
        position: "bottom",
        // Just check during test mode. Otherwise, clicking it will result to random error on loading the Chart.js script.
        run: () => {},
    }]);
