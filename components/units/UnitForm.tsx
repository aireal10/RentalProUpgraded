
import React, { useState } from "react";
import { useMutation, useQueryClient } from "../../hooks/useApi";
import { base44 } from "../../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { X, Save } from "../Icons";
import { Unit, Property } from "../../types";

interface UnitFormProps {
  unit: Unit | null;
  properties: Property[];
  onClose: () => void;
}

export default function UnitForm({ unit, properties, onClose }: UnitFormProps) {
  const [formData, setFormData] = useState({
    property_id: unit?.property_id || "",
    unit_number: unit?.unit_number || "",
    rent_amount: unit?.rent_amount ?? 0,
    status: unit?.status || "vacant",
    unit_type: unit?.unit_type || "Flat",
    // Detailed Specs
    num_rooms: unit?.num_rooms ?? 2,
    num_halls: unit?.num_halls ?? 1,
    num_kitchens: unit?.num_kitchens ?? 1,
    num_bathrooms: unit?.num_bathrooms ?? 1,
    
    occupancy_type: unit?.occupancy_type || "Family",
    furnished: unit?.furnished || false,
    has_parking: unit?.has_parking || false,

    // Utility Status
    electricity_meter: unit?.electricity_meter || "",
    water_meter: unit?.water_meter || "",
    gas_meter: unit?.gas_meter || "",
    internet_account: unit?.internet_account || "",
    electricity_bill_paid: unit?.electricity_bill_paid || false,
    water_bill_paid: unit?.water_bill_paid || false,
    gas_bill_paid: unit?.gas_bill_paid || false,
    internet_bill_paid: unit?.internet_bill_paid || false,
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      if (unit) {
        return base44.entities.Unit.update(unit.id, data);
      }
      return base44.entities.Unit.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['units']);
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Card className="shadow-lg border-none w-full max-w-xl mx-auto max-h-[90vh] overflow-y-auto">
      <CardHeader className="bg-slate-50 border-b py-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">{unit ? 'Edit Unit' : 'Add New Unit'}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="property_id" className="text-[10px] font-bold text-slate-500 uppercase">Property *</Label>
              <Select value={formData.property_id} onChange={(e) => setFormData({ ...formData, property_id: e.target.value })} required className="h-8 text-sm">
                <option value="" disabled>Select property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>{property.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="unit_number" className="text-[10px] font-bold text-slate-500 uppercase">Unit Number *</Label>
              <Input id="unit_number" value={formData.unit_number} onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })} placeholder="e.g., 101" required className="h-8 text-sm"/>
            </div>
          </div>

          <div className="border-t border-b py-3 my-2 bg-slate-50 -mx-6 px-6">
             <Label className="text-xs font-bold text-slate-700 block mb-2">Specifications</Label>
             <div className="grid grid-cols-5 gap-2">
                 <div className="space-y-1">
                    <Label htmlFor="unit_type" className="text-[10px] text-slate-500">Type</Label>
                    <Select value={formData.unit_type} onChange={(e) => setFormData({ ...formData, unit_type: e.target.value as any })} className="h-8 text-xs">
                        <option value="Flat">Flat</option>
                        <option value="Room">Room</option>
                    </Select>
                 </div>
                 <div className="space-y-1">
                    <Label htmlFor="num_rooms" className="text-[10px] text-slate-500">Rooms</Label>
                    <Select value={formData.num_rooms} onChange={(e) => setFormData({ ...formData, num_rooms: parseInt(e.target.value) })} className="h-8 text-xs">
                        {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                    </Select>
                 </div>
                 <div className="space-y-1">
                    <Label htmlFor="num_halls" className="text-[10px] text-slate-500">Halls</Label>
                    <Select value={formData.num_halls} onChange={(e) => setFormData({ ...formData, num_halls: parseInt(e.target.value) })} className="h-8 text-xs">
                        {[0,1,2,3].map(n => <option key={n} value={n}>{n}</option>)}
                    </Select>
                 </div>
                 <div className="space-y-1">
                    <Label htmlFor="num_kitchens" className="text-[10px] text-slate-500">Kitchens</Label>
                    <Select value={formData.num_kitchens} onChange={(e) => setFormData({ ...formData, num_kitchens: parseInt(e.target.value) })} className="h-8 text-xs">
                        {[0,1,2].map(n => <option key={n} value={n}>{n}</option>)}
                    </Select>
                 </div>
                 <div className="space-y-1">
                    <Label htmlFor="num_bathrooms" className="text-[10px] text-slate-500">Baths</Label>
                    <Select value={formData.num_bathrooms} onChange={(e) => setFormData({ ...formData, num_bathrooms: parseInt(e.target.value) })} className="h-8 text-xs">
                        {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                    </Select>
                 </div>
             </div>
          </div>

           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
              <Label htmlFor="occupancy_type" className="text-[10px] font-bold text-slate-500 uppercase">Occupancy</Label>
              <Select value={formData.occupancy_type} onChange={(e) => setFormData({ ...formData, occupancy_type: e.target.value as any })} className="h-8 text-sm">
                  <option value="Family">Family</option>
                  <option value="Bachelor">Bachelor</option>
              </Select>
             </div>
             <div className="grid grid-cols-2 gap-2 pt-5">
                <div className="flex items-center space-x-2">
                  <Checkbox id="furnished" checked={formData.furnished} onCheckedChange={(c) => setFormData({...formData, furnished: !!c})} />
                  <Label htmlFor="furnished" className="cursor-pointer text-xs">Furnished</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="has_parking" checked={formData.has_parking} onCheckedChange={(c) => setFormData({...formData, has_parking: !!c})} />
                  <Label htmlFor="has_parking" className="cursor-pointer text-xs">Parking</Label>
                </div>
             </div>
           </div>
          
           {/* Utility Bills Status */}
           <div className="border-t border-b py-3 my-2 bg-slate-50 -mx-6 px-6">
                <Label className="text-xs font-bold text-slate-700 block mb-2">Utility Accounts & Bill Status</Label>
                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <div className="flex justify-between">
                            <Label className="text-[10px] uppercase">Elec Meter</Label>
                            <div className="flex items-center space-x-1">
                                <Checkbox id="u_elec_paid" checked={formData.electricity_bill_paid} onCheckedChange={(c) => setFormData({ ...formData, electricity_bill_paid: !!c })} className="h-3 w-3" />
                                <Label htmlFor="u_elec_paid" className="text-[9px] cursor-pointer text-green-700">Paid</Label>
                            </div>
                        </div>
                        <Input value={formData.electricity_meter} onChange={(e) => setFormData({...formData, electricity_meter: e.target.value})} className="h-7 text-xs"/>
                     </div>
                     <div className="space-y-1">
                        <div className="flex justify-between">
                            <Label className="text-[10px] uppercase">Water Acct</Label>
                            <div className="flex items-center space-x-1">
                                <Checkbox id="u_water_paid" checked={formData.water_bill_paid} onCheckedChange={(c) => setFormData({ ...formData, water_bill_paid: !!c })} className="h-3 w-3" />
                                <Label htmlFor="u_water_paid" className="text-[9px] cursor-pointer text-green-700">Paid</Label>
                            </div>
                        </div>
                        <Input value={formData.water_meter} onChange={(e) => setFormData({...formData, water_meter: e.target.value})} className="h-7 text-xs"/>
                     </div>
                     <div className="space-y-1">
                        <div className="flex justify-between">
                            <Label className="text-[10px] uppercase">Gas Acct</Label>
                            <div className="flex items-center space-x-1">
                                <Checkbox id="u_gas_paid" checked={formData.gas_bill_paid} onCheckedChange={(c) => setFormData({ ...formData, gas_bill_paid: !!c })} className="h-3 w-3" />
                                <Label htmlFor="u_gas_paid" className="text-[9px] cursor-pointer text-green-700">Paid</Label>
                            </div>
                        </div>
                        <Input value={formData.gas_meter} onChange={(e) => setFormData({...formData, gas_meter: e.target.value})} className="h-7 text-xs"/>
                     </div>
                     <div className="space-y-1">
                        <div className="flex justify-between">
                            <Label className="text-[10px] uppercase">Internet Acct</Label>
                            <div className="flex items-center space-x-1">
                                <Checkbox id="u_net_paid" checked={formData.internet_bill_paid} onCheckedChange={(c) => setFormData({ ...formData, internet_bill_paid: !!c })} className="h-3 w-3" />
                                <Label htmlFor="u_net_paid" className="text-[9px] cursor-pointer text-green-700">Paid</Label>
                            </div>
                        </div>
                        <Input value={formData.internet_account} onChange={(e) => setFormData({...formData, internet_account: e.target.value})} className="h-7 text-xs"/>
                     </div>
                </div>
           </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-3">
            <div className="space-y-1">
              <Label htmlFor="rent_amount" className="text-[10px] font-bold text-slate-500 uppercase">Rent (SAR)</Label>
              <Input id="rent_amount" type="number" min="0" step="0.01" value={formData.rent_amount || ''} onChange={(e) => setFormData({ ...formData, rent_amount: parseFloat(e.target.value) || 0 })} required className="h-8 text-sm"/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="status" className="text-[10px] font-bold text-slate-500 uppercase">Status</Label>
              <Select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="h-8 text-sm">
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t py-2 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8">Cancel</Button>
          <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 h-8" disabled={saveMutation.isPending}>
            <Save className="w-3 h-3 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Unit'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
