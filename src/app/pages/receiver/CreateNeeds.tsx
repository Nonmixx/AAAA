// @ts-nocheck
import type React from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Package, AlertCircle, ImagePlus, X } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCurrentReceiverContext } from '@/lib/supabase/receiver';
import { uploadPublicImage } from '@/lib/supabase/media';

type Urgency = 'low' | 'medium' | 'high';

type NeedForm = {
  title: string;
  description: string;
  category: string;
  quantity: string;
  urgency: Urgency;
  details: string;
};

export function CreateNeeds() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingNeedId = searchParams.get('need');
  const isEditing = !!editingNeedId;
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [needImageFile, setNeedImageFile] = useState<File | null>(null);
  const [needImagePreview, setNeedImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [form, setForm] = useState<NeedForm>({
    title: '',
    description: '',
    category: '',
    quantity: '',
    urgency: 'medium',
    details: '',
  });

  useEffect(() => {
    const loadOrganizationAndNeed = async () => {
      setErrorMessage(null);
      setInitializing(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const context = await getCurrentReceiverContext();
        setOrganizationId(context.organization.id);

        if (!editingNeedId) {
          setExistingImageUrl(null);
          return;
        }

        const { data: need, error } = await supabase
          .from('needs')
          .select('id, organization_id, title, image_url, description, category, quantity_requested, urgency')
          .eq('id', editingNeedId)
          .eq('organization_id', context.organization.id)
          .maybeSingle();

        if (error) throw error;
        if (!need) {
          setErrorMessage('Need not found or you do not have access to edit it.');
          return;
        }

        const descriptionText = typeof need.description === 'string' ? need.description : '';
        const detailsMarker = '\n\nAdditional Details:\n';
        const markerIndex = descriptionText.indexOf(detailsMarker);
        const baseDescription = markerIndex >= 0 ? descriptionText.slice(0, markerIndex) : descriptionText;
        const additionalDetails = markerIndex >= 0 ? descriptionText.slice(markerIndex + detailsMarker.length) : '';

        setForm({
          title: need.title ?? '',
          description: baseDescription,
          category: need.category ?? '',
          quantity: need.quantity_requested ? String(need.quantity_requested) : '',
          urgency: (need.urgency as Urgency) ?? 'medium',
          details: additionalDetails,
        });
        setExistingImageUrl(need.image_url ?? null);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Unable to load organization.');
      } finally {
        setInitializing(false);
      }
    };

    void loadOrganizationAndNeed();
  }, [editingNeedId]);

  useEffect(() => {
    if (!needImageFile) {
      setNeedImagePreview(existingImageUrl);
      return;
    }

    const objectUrl = URL.createObjectURL(needImageFile);
    setNeedImagePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [existingImageUrl, needImageFile]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onUrgencyChange = (value: Urgency) => {
    setForm((prev) => ({ ...prev, urgency: value }));
  };

  const onNeedImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setNeedImageFile(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload an image file for the need.');
      e.target.value = '';
      return;
    }

    setErrorMessage(null);
    setNeedImageFile(file);
  };

  const clearNeedImage = () => {
    setNeedImageFile(null);
    setNeedImagePreview(null);
    setExistingImageUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setWarningMessage(null);
    setSuccessMessage(null);

    if (!organizationId) {
      setErrorMessage('Organization not found. Complete receiver verification first.');
      return;
    }

    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setErrorMessage('Quantity must be more than 0.');
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let imageUrl: string | null = existingImageUrl;
      if (needImageFile) {
        try {
          imageUrl = await uploadPublicImage(needImageFile, `needs/${organizationId}`);
        } catch (uploadError) {
          imageUrl = null;
          setWarningMessage(
            uploadError instanceof Error
              ? `${uploadError.message} Posting the need without an image.`
              : 'Image upload failed. Posting the need without an image.',
          );
        }
      }

      const payload = {
        organization_id: organizationId,
        created_by_profile_id: user?.id ?? null,
        title: form.title,
        image_url: imageUrl,
        description: form.details ? `${form.description}\n\nAdditional Details:\n${form.details}` : form.description,
        category: form.category,
        quantity_requested: quantity,
        urgency: form.urgency,
      };

      const { error } = isEditing
        ? await supabase
            .from('needs')
            .update(payload)
            .eq('id', editingNeedId)
            .eq('organization_id', organizationId)
        : await supabase.from('needs').insert({
            ...payload,
            status: 'active',
            published_at: new Date().toISOString(),
          });

      if (error) throw error;

      setSuccessMessage(isEditing ? 'Need updated successfully.' : 'Need posted successfully.');
      setForm({
        title: '',
        description: '',
        category: '',
        quantity: '',
        urgency: 'medium',
        details: '',
      });
      clearNeedImage();
      if (isEditing) {
        router.replace('/receiver');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : isEditing ? 'Unable to update need.' : 'Unable to post need.');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Loading need details...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[#000000] font-bold">{isEditing ? 'Edit Need' : 'Create New Need'}</h1>
        <p className="text-gray-600">
          {isEditing ? 'Update your organization&apos;s request and keep donors informed' : 'Post your organization&apos;s requirements to attract donors'}
        </p>
      </div>

      <div className="bg-white rounded-2xl p-8 border-2 border-[#e5e5e5] shadow-sm">
        <div className="flex items-center gap-3 mb-6 p-4 bg-[#edf2f4] rounded-xl">
          <div className="w-10 h-10 bg-[#da1a32] rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-[#000000]">Describe Your Needs</h3>
            <p className="text-sm text-gray-600">
              {isEditing ? 'Adjust the details below to update this published need' : 'Be specific to help donors understand your requirements'}
            </p>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          {warningMessage && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {warningMessage}
            </div>
          )}

          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Need Title</label>
            <input
              name="title"
              value={form.title}
              onChange={onChange}
              required
              placeholder="Example: Food Packs for 80 children"
              className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Need Image (Optional)</label>
            <div className="rounded-2xl border-2 border-dashed border-[#e5e5e5] bg-[#edf2f4]/50 p-5">
              {needImagePreview ? (
                <div className="relative overflow-hidden rounded-xl border border-[#e5e5e5] bg-white">
                  <img src={needImagePreview} alt="Need preview" className="h-56 w-full object-cover" />
                  <button
                    type="button"
                    onClick={clearNeedImage}
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-white bg-white px-6 py-10 text-center transition-colors hover:border-[#da1a32]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#da1a32] text-white">
                    <ImagePlus className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium text-[#000000]">Upload a photo for this need</p>
                    <p className="mt-1 text-sm text-gray-600">Use a clear image of the requested items, storage area, or delivery context.</p>
                  </div>
                  <span className="rounded-lg border border-[#e5e5e5] px-4 py-2 text-sm font-medium text-[#000000]">
                    Choose Image
                  </span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onNeedImageChange} />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">What do you need?</label>
            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              required
              placeholder="Example: We need food packs for 80 children. Each pack should contain rice, cooking oil, and canned food..."
              rows={6}
              className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2 text-[#000000] font-medium">Item Category</label>
              <select name="category" value={form.category} onChange={onChange} required className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent bg-white text-[#000000]">
                <option value="">Select category</option>
                <option>Food & Supplies</option>
                <option>Medical Supplies</option>
                <option>Clothing & Blankets</option>
                <option>Education Materials</option>
                <option>Furniture & Equipment</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2 text-[#000000] font-medium">Quantity Needed</label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  name="quantity"
                  type="number"
                  value={form.quantity}
                  onChange={onChange}
                  required
                  placeholder="Enter quantity"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Urgency Level</label>
            <div className="grid grid-cols-3 gap-4">
              <label className="cursor-pointer">
                <input type="radio" name="urgency" value="low" checked={form.urgency === 'low'} onChange={() => onUrgencyChange('low')} className="peer sr-only" />
                <div className="border-2 border-[#e5e5e5] rounded-xl p-4 text-center peer-checked:border-green-500 peer-checked:bg-green-50 transition-all">
                  <div className="w-8 h-8 bg-green-50 rounded-xl mx-auto mb-2 flex items-center justify-center peer-checked:bg-green-500">
                    <div className="w-3 h-3 bg-green-500 rounded-full peer-checked:bg-white"></div>
                  </div>
                  <div className="font-medium text-[#000000]">Low</div>
                  <div className="text-xs text-gray-600">Can wait</div>
                </div>
              </label>

              <label className="cursor-pointer">
                <input type="radio" name="urgency" value="medium" checked={form.urgency === 'medium'} onChange={() => onUrgencyChange('medium')} className="peer sr-only" />
                <div className="border-2 border-[#e5e5e5] rounded-xl p-4 text-center peer-checked:border-yellow-500 peer-checked:bg-yellow-50 transition-all">
                  <div className="w-8 h-8 bg-yellow-50 rounded-xl mx-auto mb-2 flex items-center justify-center peer-checked:bg-yellow-500">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full peer-checked:bg-white"></div>
                  </div>
                  <div className="font-medium text-[#000000]">Medium</div>
                  <div className="text-xs text-gray-600">Within weeks</div>
                </div>
              </label>

              <label className="cursor-pointer">
                <input type="radio" name="urgency" value="high" checked={form.urgency === 'high'} onChange={() => onUrgencyChange('high')} className="peer sr-only" />
                <div className="border-2 border-[#e5e5e5] rounded-xl p-4 text-center peer-checked:border-red-500 peer-checked:bg-red-50 transition-all">
                  <div className="w-8 h-8 bg-red-50 rounded-xl mx-auto mb-2 flex items-center justify-center peer-checked:bg-red-500">
                    <AlertCircle className="w-4 h-4 text-red-500 peer-checked:text-white" />
                  </div>
                  <div className="font-medium text-[#000000]">High</div>
                  <div className="text-xs text-gray-600">Urgent</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Additional Details (Optional)</label>
            <textarea
              name="details"
              value={form.details}
              onChange={onChange}
              placeholder="Any specific requirements, preferred delivery time, special handling instructions..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
            />
          </div>

          <div className="bg-[#edf2f4] border-2 border-[#e5e5e5] rounded-xl p-4">
            <h4 className="text-sm mb-2 text-[#000000] font-medium">Tips for Better Results:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>- Be specific about quantities and item details</li>
              <li>- Explain why these items are needed</li>
              <li>- Set realistic urgency levels</li>
              <li>- Include any special requirements upfront</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading || !organizationId}
            className="w-full bg-[#da1a32] text-white py-3 rounded-xl hover:bg-[#b01528] transition-all shadow-lg font-medium"
          >
            {loading ? (isEditing ? 'Saving...' : 'Posting...') : isEditing ? 'Save Changes' : 'Post Need'}
          </button>
        </form>
      </div>
    </div>
  );
}
