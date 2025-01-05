from odoo import api, models, fields

class EmployeeMedical(models.Model):
    _inherit = "hr.employee"



    allergies = fields.Text(string="Allergies")
    blood_type = fields.Char(string="Blood Type")
    medications = fields.Text(string="Medications")
    emergency_contact = fields.Char(string="Emergency Contact")
    medical_status = fields.Selection([
        ('healthy', 'Healthy'),
        ('under_treatment', 'Under Treatment'),
        ('recovered', 'Recovered'),
        ('critical', 'Critical'),
        ('unknown', 'Unknown'),
    ], string="Medical Status", default='healthy')

