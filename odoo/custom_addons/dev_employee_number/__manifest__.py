# -*- coding: utf-8 -*-
##############################################################################
#
#    OpenERP, Open Source Management Solution
#    Copyright (C) 2015 DevIntelle Consulting Service Pvt.Ltd (<http://www.devintellecs.com>).
#
#    For Module Support : devintelle@gmail.com  or Skype : devintelle
#
##############################################################################

{
    'name': 'Employee Number',
    'version': '17.3',
    'sequence': 1,
    'category': 'Human Resources',
    'description':
        """
Employee Sequence Number Odoo app allows companies to assign unique, auto-generated employee identification numbers automatically upon creating new employee records. It helps in easy identification and management of employee records, ensuring that each employee has a distinct and consistent reference across all HR-related processes. With this app, tracking and organizing employee data becomes more efficient, reducing the likelihood of duplication and ensuring proper record management.
Auto-generation of unique employee sequence numbers for each new employee.
Automated sequence assignment ensures efficiency and accuracy in employee record-keeping.
    """,
    'summary': 'Odoo app will add Employee Number on Employee screen',
    'depends': ['base', 'hr'],
    'data': [
        'views/employee_sequence.xml',
        'views/employee_view.xml'
    ],
    'demo': [],
    'test': [],
    'css': [],
    'qweb': [],
    'js': [],
    'images': ['images/main_screenshot.png'],
    'installable': True,
    'application': True,
    'auto_install': False,
    'post_init_hook': '_post_init_hook',

    #author and support Details ==========#
    'author': 'DevIntelle Consulting Service Pvt.Ltd',
    'website': 'http://www.devintellecs.com',    
    'maintainer': 'DevIntelle Consulting Service Pvt.Ltd', 
    'support': 'devintelle@gmail.com',
    'pre_init_hook' :'pre_init_check',
}

# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
