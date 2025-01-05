# -*- coding: utf-8 -*-
##############################################################################
#
#    OpenERP, Open Source Management Solution
#    Copyright (C) 2015 DevIntelle Consulting Service Pvt.Ltd (<http://www.devintellecs.com>).
#
#    For Module Support : devintelle@gmail.com  or Skype : devintelle
#
##############################################################################

from odoo import models, fields, api, _


class hr_employee(models.Model):
    _inherit = 'hr.employee'

    emp_seq = fields.Char("Employee Sequence", required=True, readonly=True, copy=False, default='/')
    
    @api.model
    def create(self, vals):
        if vals.get('emp_seq',  '/') == '/':
            vals['emp_seq'] = self.env['ir.sequence'].next_by_code(
                'hr.employee') or '/'
        return super(hr_employee, self).create(vals)
        
        
    def copy(self, default=None):
        if default is None:
            default = {}
        default['emp_seq'] = '/'
        return super(hr_employee, self).copy(default=default)

    @api.model
    def update_missing_sequences(self):
        """Update emp_seq for employees with missing or placeholder sequences."""
        employees = self.search([('emp_seq', '=', '/')])
        for employee in employees:
            # Generate a new sequence for employees with missing sequences
            employee.emp_seq = self.env['ir.sequence'].next_by_code('hr.employee') or '/'

        return len(employees)  # Return the number of updated employees

    
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:

# Define the _post_init_hook outside the class
def _post_init_hook(cr, registry):
    """Automatically update missing sequences after module installation."""
    from odoo.api import Environment, SUPERUSER_ID
    env = Environment(cr, SUPERUSER_ID, {})
    env['hr.employee'].update_missing_sequences()