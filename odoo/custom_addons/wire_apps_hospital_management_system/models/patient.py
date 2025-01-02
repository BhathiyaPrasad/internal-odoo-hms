from odoo import api, models, fields


class HospitalPatient(models.Model):
    _name = "hospital.patient"
    _description = "Patient Record"

    name = fields.Char(string='Name', required=True)
    date_of_birth = fields.Date(string='Date of Birth')
    gender = fields.Selection([('male', 'Male'), ('female', 'Female'), ('other', 'Other')], string='Gender')
