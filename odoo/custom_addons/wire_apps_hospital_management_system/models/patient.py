from odoo import api, models, fields


class HospitalPatient(models.Model):
    _name = "hospital.patient"
    _description = "Patient Record"

    name = fields.Char(string='Name', required=True)
    date_of_birth = fields.Date(string='Date of Birth')
    gender = fields.Selection([('male', 'Male'), ('female', 'Female'), ('other', 'Other')], string='Gender')
    blood_type = fields.Selection([('A+', 'A+'), ('A-', 'A-'), ('B+', 'B+'), ('B-', 'B-'), ('AB+', 'AB+'), ('AB-', 'AB-'), ('O+', 'O+'), ('O-', 'O-')], string='Blood Type')
    image = fields.Binary(string='Last Medical Report')
    note = fields.Text(string='Note')
    age = fields.Integer(string='Age', compute='_compute_age', store=True)
    doctor_id = fields.Many2one('hospital.doctor', string='Doctor')


    @api.depends('date_of_birth')
    def _compute_age(self):
        for rec in self:
            if rec.date_of_birth:
                rec.age = fields.Date.from_string(fields.Date.today()).year - fields.Date.from_string(rec.date_of_birth).year
            else:
                rec.age = 0
