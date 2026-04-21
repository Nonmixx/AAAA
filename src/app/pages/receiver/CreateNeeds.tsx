import { Sparkles, Package, AlertCircle } from 'lucide-react';

export function CreateNeeds() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[#000000] font-bold">Create New Need</h1>
        <p className="text-gray-600">Post your organization's requirements to attract donors</p>
      </div>

      <div className="bg-white rounded-2xl p-8 border-2 border-[#e5e5e5] shadow-sm">
        <div className="flex items-center gap-3 mb-6 p-4 bg-[#edf2f4] rounded-xl">
          <div className="w-10 h-10 bg-[#da1a32] rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-[#000000]">Describe Your Needs</h3>
            <p className="text-sm text-gray-600">Be specific to help donors understand your requirements</p>
          </div>
        </div>

        <form className="space-y-6">
          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">What do you need?</label>
            <textarea
              placeholder="Example: We need food packs for 80 children. Each pack should contain rice, cooking oil, and canned food..."
              rows={6}
              className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2 text-[#000000] font-medium">Item Category</label>
              <select className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent bg-white text-[#000000]">
                <option>Select category</option>
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
                  type="number"
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
                <input type="radio" name="urgency" value="low" className="peer sr-only" />
                <div className="border-2 border-[#e5e5e5] rounded-xl p-4 text-center peer-checked:border-green-500 peer-checked:bg-green-50 transition-all">
                  <div className="w-8 h-8 bg-green-50 rounded-xl mx-auto mb-2 flex items-center justify-center peer-checked:bg-green-500">
                    <div className="w-3 h-3 bg-green-500 rounded-full peer-checked:bg-white"></div>
                  </div>
                  <div className="font-medium text-[#000000]">Low</div>
                  <div className="text-xs text-gray-600">Can wait</div>
                </div>
              </label>

              <label className="cursor-pointer">
                <input type="radio" name="urgency" value="medium" className="peer sr-only" />
                <div className="border-2 border-[#e5e5e5] rounded-xl p-4 text-center peer-checked:border-yellow-500 peer-checked:bg-yellow-50 transition-all">
                  <div className="w-8 h-8 bg-yellow-50 rounded-xl mx-auto mb-2 flex items-center justify-center peer-checked:bg-yellow-500">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full peer-checked:bg-white"></div>
                  </div>
                  <div className="font-medium text-[#000000]">Medium</div>
                  <div className="text-xs text-gray-600">Within weeks</div>
                </div>
              </label>

              <label className="cursor-pointer">
                <input type="radio" name="urgency" value="high" className="peer sr-only" />
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
              placeholder="Any specific requirements, preferred delivery time, special handling instructions..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
            />
          </div>

          <div className="bg-[#edf2f4] border-2 border-[#e5e5e5] rounded-xl p-4">
            <h4 className="text-sm mb-2 text-[#000000] font-medium">Tips for Better Results:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Be specific about quantities and item details</li>
              <li>• Explain why these items are needed</li>
              <li>• Set realistic urgency levels</li>
              <li>• Include any special requirements upfront</li>
            </ul>
          </div>

          <button
            type="submit"
            className="w-full bg-[#da1a32] text-white py-3 rounded-xl hover:bg-[#b01528] transition-all shadow-lg font-medium"
          >
            Post Need
          </button>
        </form>
      </div>
    </div>
  );
}
