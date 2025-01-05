from odoo import api, models, fields

class EmployeeContract(models.Model):
    _inherit = "hr.contract"


    currency = fields.Selection([
        ('lkr', 'LKR'),
        ('usd', 'USD'),
        ('gbp', 'GBP'),
    ], 'Currency', default='lkr', required=True)

