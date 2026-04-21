import Link from 'next/link';
import { Heart, Building2, FileText, Upload, Phone, Mail } from 'lucide-react';

export function ReceiverVerification() {
  return (
    <div className="w-full max-w-3xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#da1a32] rounded-lg mb-4 shadow-lg">
          <Heart className="w-8 h-8 text-white" fill="white" />
        </div>
        <h1 className="text-3xl mb-2 text-white font-bold">Organization Verification</h1>
        <p className="text-white opacity-80">Complete your registration to start receiving donations</p>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-8">
        <div className="mb-6 flex items-center gap-3 p-4 bg-[#edf2f4] bg-opacity-20 rounded-lg border border-[#edf2f4]">
          <Building2 className="w-6 h-6 text-[#000000]" />
          <div>
            <h3 className="font-medium text-[#000000]">Receiver Registration</h3>
            <p className="text-sm text-gray-600">Please provide accurate information for verification</p>
          </div>
        </div>

        <form className="space-y-6">
          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Organization Name</label>
            <input
              type="text"
              placeholder="Enter organization name"
              className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Registration Number</label>
            <input
              type="text"
              placeholder="Enter registration/license number"
              className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2 text-[#000000] font-medium">Contact Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="contact@organization.org"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 text-[#000000] font-medium">Contact Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  placeholder="+60 12-345 6789"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Organization Address</label>
            <textarea
              placeholder="Enter complete address"
              rows={3}
              className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Upload Verification Documents</label>
            <div className="border-2 border-dashed border-[#e5e5e5] rounded-lg p-8 text-center hover:border-[#da1a32] transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-500">PDF, PNG, JPG (max 10MB)</p>
            </div>
          </div>

          <div className="bg-[#e5e5e5] rounded-lg p-4">
            <h4 className="flex items-center gap-2 text-sm mb-2 text-[#000000] font-medium">
              <FileText className="w-4 h-4 text-[#da1a32]" />
              Verification Status
            </h4>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#da1a32] text-white text-xs rounded-full font-medium">
                Pending Review
              </span>
              <span className="text-sm text-gray-600">
                Your application will be reviewed within 24-48 hours
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#da1a32] text-white py-3 rounded-lg hover:bg-[#b01528] transition-all font-medium shadow-lg"
          >
            Submit for Verification
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-gray-600 hover:text-[#000000]">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
