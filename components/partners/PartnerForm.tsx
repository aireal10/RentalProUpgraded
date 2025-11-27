import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "../../hooks/useApi";
import { base44 } from "../../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { X, Save, Loader2, Plus, Trash2 } from "../Icons";
import { Partner, Property, PartnerShare } from "../../types";
import { Select } from "../ui/select";

interface PartnerFormProps {
  partner: Partner | null;
  existingPartners: Partner[];
  properties: Property[];
  onClose: () => void;
}

export default function PartnerForm({ partner, existingPartners, properties, onClose }: PartnerFormProps) {
  const [name, setName] = useState(partner?.name || "");
  const [shares, setShares] = useState<PartnerShare[]>(partner?.shares || []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [currentShare, setCurrentShare] = useState<number | string>("");

  const queryClient = useQueryClient();

  const handleAddShare = () => {
    if (!selectedPropertyId || !currentShare || parseFloat(currentShare as string) <= 0) {
      setErrors({ share_adder: "Please select a property and enter a valid share percentage." });
      return;
    }
    setErrors({});
    const newShares = [...shares.filter(s => s.property_id !== selectedPropertyId), { property_id: selectedPropertyId, share_percentage: parseFloat(currentShare as string) }];
    setShares(newShares);
    setSelectedPropertyId("");
    setCurrentShare("");
  };

  const handleRemoveShare = (propertyId: string) => {
    setShares(shares.filter(s => s.property_id !== propertyId));
  };
  
  const saveMutation = useMutation({
    mutationFn: (data: { name: string, shares: PartnerShare[] }) => {
      const finalData = { ...data, shares: data.shares.filter(s => s.share_percentage > 0) };
      if (partner) return base44.entities.Partner.update(partner.id, finalData);
      return base44.entities.Partner.create(finalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['partners']);
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    let validationErrors: Record<string, string> = {};

    if (shares.length === 0 || shares.every(s => s.share_percentage <= 0)) {
        validationErrors.form = "Partner must have a profit share greater than 0% in at least one building.";
    }

    properties.forEach(prop => {
        const otherPartnersShare = existingPartners
            .filter(p => p.id !== partner?.id)
            .flatMap(p => p.shares)
            .filter(s => s.property_id === prop.id)
            .reduce((sum, s) => sum + s.share_percentage, 0);

        const currentPartnerShare = shares.find(s => s.property_id === prop.id)?.share_percentage || 0;
        
        if (otherPartnersShare + currentPartnerShare > 100) {
            validationErrors[prop.id] = `Error: Total share for this property will exceed 100% (currently ${otherPartnersShare}% is allocated to others).`;
        }
    });

    if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
    }

    saveMutation.mutate({ name, shares });
  };
  
  const availableProperties = properties.filter(p => !shares.some(s => s.property_id === p.id));

  return (
    <Card className="shadow-lg border-none max-h-[90vh] overflow-y-auto">
      <CardHeader className="bg-slate-50 border-b sticky top-0 z-10"><div className="flex justify-between items-center"><CardTitle>{partner ? 'Edit Partner' : 'Add New Partner'}</CardTitle><Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button></div></CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 pt-6">
          {errors.form && <p className="text-sm text-red-600 p-3 bg-red-50 rounded-md">{errors.form}</p>}
          <div className="space-y-2"><Label htmlFor="name">Partner Name *</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name of the partner" required /></div>
          <div>
            <h3 className="font-semibold mb-2">Profit Share per Building</h3>
            
            <div className="bg-slate-50 p-4 rounded-lg border space-y-3">
              <p className="text-sm text-slate-700">Assign shares for each building individually.</p>
              <div className="flex items-end gap-3">
                  <div className="flex-grow space-y-1">
                      <Label htmlFor="property-select" className="text-xs">Building</Label>
                      <Select id="property-select" value={selectedPropertyId} onChange={e => setSelectedPropertyId(e.target.value)} disabled={availableProperties.length === 0}>
                          <option value="">{availableProperties.length > 0 ? 'Select a building...' : 'All buildings added'}</option>
                          {availableProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </Select>
                  </div>
                   <div className="space-y-1 w-32">
                      <Label htmlFor="share-input" className="text-xs">Share %</Label>
                      <Input id="share-input" type="number" min="0.01" max="100" step="0.01" value={currentShare} onChange={e => setCurrentShare(e.target.value)} placeholder="0.00" />
                  </div>
                  <Button type="button" onClick={handleAddShare} className="h-10"><Plus className="w-4 h-4 mr-1"/> Add</Button>
              </div>
              {errors.share_adder && <p className="text-xs text-red-600">{errors.share_adder}</p>}
            </div>

            <div className="mt-4 space-y-2">
              <h4 className="font-medium text-sm text-slate-600">Assigned Shares:</h4>
              {shares.length > 0 ? (
                <div className="space-y-2">
                  {shares.map(share => (
                    <div key={share.property_id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div>
                        <p className="font-medium">{properties.find(p => p.id === share.property_id)?.name}</p>
                        <p className="text-sm text-blue-600 font-semibold">{share.share_percentage}%</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveShare(share.property_id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-slate-500 py-4 border rounded-lg border-dashed">No shares assigned yet.</div>
              )}
              {Object.keys(errors).filter(k => k !== 'form' && k !== 'share_adder').map(key => (
                   <p key={key} className="text-xs text-red-600 mt-1">{errors[key]}</p>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t flex justify-end gap-3 sticky bottom-0 z-10">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>) : (<><Save className="w-4 h-4 mr-2" />Save Partner</>)}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}