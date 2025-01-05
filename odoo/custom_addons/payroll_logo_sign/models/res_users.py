from odoo import models, fields


class ResCompany(models.Model):
    _inherit = 'res.company'

    # ----------------------------------------------------------
    # Fields
    # ----------------------------------------------------------

    payslip_logo = fields.Binary(
        string='Pay Slip Logo',
        attachment=True
    )
    payslip_sign = fields.Binary(
        string='Pay Slip Sign',
        attachment=True
    )