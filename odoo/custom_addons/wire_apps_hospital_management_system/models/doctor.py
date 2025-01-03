from odoo import api, models, fields


class HospitalDoctor(models.Model):
    _name = "hospital.doctor"
    _description = "Doctor Record"

    name = fields.Char(string='Name', required=True)
    birth_date = fields.Date(string='Date of Birth')
    age = fields.Integer(string='Age', compute='_compute_age_doctor', store=True)
    contact = fields.Char(string='Contact')
    email = fields.Char(string='Email')
    car_number = fields.Char(string='Car Number')
    image = fields.Binary(string='Image')

    @api.depends('birth_date')
    def _compute_age_doctor(self):
        for rec in self:
            if rec.birth_date:
                today = fields.Date.today()
                birth_year = fields.Date.from_string(rec.birth_date).year
                rec.age = today.year - birth_year
            else:
                rec.age = 0
