from odoo import api, fields, models


class PayrollSignLogo(models.TransientModel):
    _inherit = 'res.config.settings'

    # ----------------------------------------------------------
    # Fields
    # ----------------------------------------------------------

    payslip_logo = fields.Binary(
        related='company_id.payslip_logo',
        readonly=False
    )
    payslip_sign = fields.Binary(
        related='company_id.payslip_sign',
        readonly=False
    )
