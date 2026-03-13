import React from 'react';
import { Phone, Mail, MessageCircle, MapPin, User, Code, HelpCircle, Clock } from 'lucide-react';

const Support = () => {
  const developerInfo = {
    name: 'ibrahim developer',
    role: 'System Developer',
    company: 'EggPro System',
    email: 'ibrahimmsangi439@gmail.com',
    phone: '+255 780 822 017',
    mobile: '0780822017',
    location: 'Arusha, Tanzania',
    workingHours: 'Monday - Friday: 8:00 AM - 6:00 PM',
    supportEmail: 'ibrahimmsangi439@gmail.com',
    technicalSupport: 'ibrahimmsangi439@gmail.com'
  };

  const handleCall = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmail = (email) => {
    window.location.href = `mailto:${email}`;
  };

  const handleWhatsApp = (phone) => {
    const message = encodeURIComponent('Hello, I need help with EggPro System.');
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-600 rounded flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support & Help</h1>
            <p className="text-sm text-gray-600">Get assistance from our support team</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
          {/* Developer Information */}
          <div className="border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Code className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Developer Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Developer Name</p>
                  <p className="text-base font-medium text-gray-900">{developerInfo.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Code className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Role</p>
                  <p className="text-base font-medium text-gray-900">{developerInfo.role}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="text-base font-medium text-gray-900">{developerInfo.location}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Working Hours</p>
                  <p className="text-base font-medium text-gray-900">{developerInfo.workingHours}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Phone className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone */}
              <div className="border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">Phone</p>
                </div>
                <p className="text-base text-gray-900 mb-2">{developerInfo.phone}</p>
                <button
                  onClick={() => handleCall(developerInfo.phone)}
                  className="text-sm text-purple-600 hover:text-purple-700 hover:underline"
                >
                  Call Now
                </button>
              </div>

              {/* Mobile */}
              <div className="border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">Mobile</p>
                </div>
                <p className="text-base text-gray-900 mb-2">{developerInfo.mobile}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCall(developerInfo.mobile)}
                    className="text-sm text-purple-600 hover:text-purple-700 hover:underline"
                  >
                    Call
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => handleWhatsApp(developerInfo.mobile)}
                    className="text-sm text-green-600 hover:text-green-700 hover:underline"
                  >
                    WhatsApp
                  </button>
                </div>
              </div>

              {/* Email */}
              <div className="border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">Email</p>
                </div>
                <p className="text-base text-gray-900 mb-2">{developerInfo.email}</p>
                <button
                  onClick={() => handleEmail(developerInfo.email)}
                  className="text-sm text-purple-600 hover:text-purple-700 hover:underline"
                >
                  Send Email
                </button>
              </div>

              {/* Support Email */}
              <div className="border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">Support Email</p>
                </div>
                <p className="text-base text-gray-900 mb-2">{developerInfo.supportEmail}</p>
                <button
                  onClick={() => handleEmail(developerInfo.supportEmail)}
                  className="text-sm text-purple-600 hover:text-purple-700 hover:underline"
                >
                  Send Email
                </button>
              </div>
            </div>
          </div>

          {/* Help & Support */}
          <div className="border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <HelpCircle className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Help & Support</h2>
            </div>
            <div className="space-y-3 text-sm text-gray-600">
              <p>• For technical issues, please contact our technical support team</p>
              <p>• For billing and subscription inquiries, use the support email</p>
              <p>• For urgent matters, please call directly</p>
              <p>• Response time: Within 24 hours for emails, immediate for calls</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border border-gray-200 p-6 bg-gray-50">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleCall(developerInfo.phone)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 border border-gray-300"
              >
                <Phone className="w-4 h-4" />
                Call Support
              </button>
              <button
                onClick={() => handleEmail(developerInfo.supportEmail)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              >
                <Mail className="w-4 h-4" />
                Email Support
              </button>
              <button
                onClick={() => handleWhatsApp(developerInfo.mobile)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 border border-gray-300"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp Support
              </button>
            </div>
          </div>
      </div>
    </div>
  );
};

export default Support;

