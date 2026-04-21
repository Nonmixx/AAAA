import { useEffect, useState } from 'react';
import { Building2, Mail, Phone, MapPin, FileText, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCurrentReceiverContext } from '@/lib/supabase/receiver';

type VerificationStatus = 'pending' | 'approved' | 'rejected';

type Organization = {
  id: string;
  name: string;
  registration_number: string;
  contact_email: string;
  contact_phone: string | null;
  address: string | null;
  description: string | null;
  verification_status: VerificationStatus;
  created_at: string;
};

type OrgDocument = {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  created_at: string;
};

export function ReceiverProfile() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [documents, setDocuments] = useState<OrgDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [docForm, setDocForm] = useState({
    documentType: '',
    fileName: '',
    fileUrl: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const supabase = getSupabaseBrowserClient();
        const context = await getCurrentReceiverContext();
        setOrganization(context.organization as Organization);

        const { data: docs, error: docsError } = await supabase
          .from('organization_documents')
          .select('id, document_type, file_name, file_url, created_at')
          .eq('organization_id', context.organization.id)
          .order('created_at', { ascending: false });

        if (docsError) throw docsError;
        setDocuments((docs ?? []) as OrgDocument[]);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Unable to load organization profile.');
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  const statusConfig = {
    pending: {
      color: 'bg-yellow-50 text-yellow-700 border-yellow-100',
      icon: Clock,
      label: 'Pending Review',
      message: 'Your application is under review. We will notify you within 24-48 hours.',
    },
    approved: {
      color: 'bg-green-50 text-green-600 border-green-100',
      icon: CheckCircle2,
      label: 'Approved',
      message: 'Your organization has been verified and approved.',
    },
    rejected: {
      color: 'bg-red-50 text-red-600 border-red-100',
      icon: XCircle,
      label: 'Rejected',
      message: 'Your application was not approved. Please contact support for more information.',
    },
  };

  const verificationStatus = organization?.verification_status ?? 'pending';
  const StatusIcon = statusConfig[verificationStatus].icon;

  const updateOrgField = (field: keyof Organization, value: string) => {
    if (!organization) return;
    setOrganization({ ...organization, [field]: value });
  };

  const saveProfile = async () => {
    if (!organization) return;

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from('organizations')
        .update({
          name: organization.name,
          registration_number: organization.registration_number,
          contact_email: organization.contact_email,
          contact_phone: organization.contact_phone,
          address: organization.address,
          description: organization.description,
        })
        .eq('id', organization.id);

      if (error) throw error;
      setSuccessMessage('Organization profile updated successfully.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const addDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        organization_id: organization.id,
        uploaded_by_profile_id: user?.id ?? null,
        document_type: docForm.documentType,
        file_name: docForm.fileName,
        file_url: docForm.fileUrl,
      };

      const { error } = await supabase.from('organization_documents').insert(payload);
      if (error) throw error;

      const { data: docs, error: docsError } = await supabase
        .from('organization_documents')
        .select('id, document_type, file_name, file_url, created_at')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      setDocuments((docs ?? []) as OrgDocument[]);
      setDocForm({ documentType: '', fileName: '', fileUrl: '' });
      setSuccessMessage('Document added successfully.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to add document.');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[#000000] font-bold">Organization Profile</h1>
        <p className="text-gray-600">Manage your organization information and verification status</p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-8 border-2 border-[#e5e5e5] shadow-sm">
            <h2 className="text-xl mb-6 text-[#000000] font-bold">Organization Information</h2>

            {loading || !organization ? (
              <div className="text-sm text-gray-500">Loading organization profile...</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2 text-[#000000] font-medium">Organization Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={organization.name}
                      onChange={(e) => updateOrgField('name', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-[#000000] font-medium">Registration Number</label>
                  <input
                    type="text"
                    value={organization.registration_number}
                    onChange={(e) => updateOrgField('registration_number', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2 text-[#000000] font-medium">Contact Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={organization.contact_email}
                        onChange={(e) => updateOrgField('contact_email', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-[#000000] font-medium">Contact Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={organization.contact_phone ?? ''}
                        onChange={(e) => updateOrgField('contact_phone', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-[#000000] font-medium">Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea
                      rows={3}
                      value={organization.address ?? ''}
                      onChange={(e) => updateOrgField('address', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-[#000000] font-medium">Organization Description</label>
                  <textarea
                    rows={4}
                    value={organization.description ?? ''}
                    onChange={(e) => updateOrgField('description', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                  />
                </div>

                <button
                  onClick={() => void saveProfile()}
                  disabled={saving}
                  className="bg-[#da1a32] text-white px-6 py-3 rounded-xl hover:bg-[#b01528] transition-all shadow-lg font-medium"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-8 border-2 border-[#e5e5e5] shadow-sm">
            <h2 className="text-xl mb-6 text-[#000000] font-bold">Verification Documents</h2>

            <form onSubmit={addDocument} className="space-y-3 mb-5">
              <input
                required
                value={docForm.documentType}
                onChange={(e) => setDocForm((prev) => ({ ...prev, documentType: e.target.value }))}
                placeholder="Document Type (Registration Certificate)"
                className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
              />
              <input
                required
                value={docForm.fileName}
                onChange={(e) => setDocForm((prev) => ({ ...prev, fileName: e.target.value }))}
                placeholder="File Name (registration-cert.pdf)"
                className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
              />
              <input
                required
                value={docForm.fileUrl}
                onChange={(e) => setDocForm((prev) => ({ ...prev, fileUrl: e.target.value }))}
                placeholder="File URL (Supabase Storage public URL)"
                className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
              />
              <button type="submit" className="w-full bg-[#da1a32] text-white py-3 rounded-xl hover:bg-[#b01528] transition-all shadow-lg font-medium">
                Add Document
              </button>
            </form>

            <div className="space-y-4">
              {documents.length === 0 && <div className="text-sm text-gray-500">No documents uploaded yet.</div>}
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-4 p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                  <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-[#000000]">{doc.document_type}</div>
                    <div className="text-sm text-gray-600">{doc.file_name} • {new Date(doc.created_at).toLocaleDateString('en-GB')}</div>
                  </div>
                  <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-[#da1a32] text-sm hover:text-[#b01528] font-medium">
                    View
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className={`rounded-2xl p-6 border-2 shadow-sm ${statusConfig[verificationStatus].color}`}>
            <div className="flex items-center gap-3 mb-4">
              <StatusIcon className="w-8 h-8" />
              <div>
                <h3 className="text-lg">Verification Status</h3>
                <div className="text-sm opacity-80">{statusConfig[verificationStatus].label}</div>
              </div>
            </div>
            <p className="text-sm">{statusConfig[verificationStatus].message}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm">
            <h3 className="text-lg mb-4 text-[#000000] font-bold">Organization Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Documents Uploaded</span>
                <span className="font-medium text-[#000000]">{documents.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Member Since</span>
                <span className="font-medium text-[#000000]">
                  {organization ? new Date(organization.created_at).toLocaleDateString('en-GB') : '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#da1a32] to-[#b01528] rounded-2xl p-6 text-white shadow-lg">
            <Building2 className="w-10 h-10 mb-3" />
            <h3 className="text-lg mb-2 font-bold">Need Help?</h3>
            <p className="text-sm text-white opacity-80 mb-4">
              Contact our support team for assistance with your account
            </p>
            <button className="w-full bg-white text-[#da1a32] py-2 rounded-xl hover:bg-[#edf2f4] transition-all text-sm shadow-sm font-medium">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
