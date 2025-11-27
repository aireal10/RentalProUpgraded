
import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "../hooks/useApi";
import { useConfirmation } from "../hooks/useConfirmation";
import { base44 } from "../services/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Plus, Home, Trash2 } from "../components/Icons";
import { Select } from "../components/ui/select";
import { Label } from "../components/ui/label";
import UnitForm from "../components/units/UnitForm";
import UnitTable from "../components/units/UnitTable";
import { Unit, Property, Contract, Tenant } from "../types";

type StatusFilter = 'all' | 'vacant' | 'occupied';

export default function Units() {
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [hallFilter, setHallFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState("");
  
  const queryClient = useQueryClient();
  const { prompt: confirmDelete, ConfirmationModal } = useConfirmation();

  const { data: units = [], isLoading: loadingUnits } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
  });
  
  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list(),
  });

  const { data: tenants = [], isLoading: loadingTenants } = useQuery<Tenant[]>({
    queryKey: ['tenants'],
    queryFn: () => base44.entities.Tenant.list(),
  });

  const isLoading = loadingUnits || !contracts || loadingTenants;

  const getTenantName = (unitId: string) => {
    const contract = contracts.find(c => c.unit_id === unitId && c.status === 'active');
    if (!contract) return '';
    const tenant = tenants.find(t => t.id === contract.tenant_id);
    return tenant?.name || '';
  };
  const getPropertyName = (propertyId: string) => properties.find(p => p.id === propertyId)?.name || '';

  const filteredUnits = useMemo(() => {
    const lowercasedSearch = searchTerm.toLowerCase();
    return units.filter(u => {
      const statusMatch = statusFilter === 'all' || u.status === statusFilter;
      const roomMatch = roomFilter === 'all' || u.num_rooms.toString() === roomFilter;
      const hallMatch = hallFilter === 'all' || u.num_halls.toString() === hallFilter;
      const typeMatch = typeFilter === 'all' || u.occupancy_type === typeFilter;

      const searchMatch = !searchTerm ||
        u.unit_number.toLowerCase().includes(lowercasedSearch) ||
        getPropertyName(u.property_id).toLowerCase().includes(lowercasedSearch) ||
        getTenantName(u.id).toLowerCase().includes(lowercasedSearch);
        
      return statusMatch && roomMatch && hallMatch && typeMatch && searchMatch;
    });
  }, [units, statusFilter, roomFilter, hallFilter, typeFilter, searchTerm, properties, contracts, tenants]);

  useEffect(() => {
    setSelectedIds([]);
  }, [statusFilter, roomFilter, hallFilter, typeFilter, searchTerm]);


  const deleteUnit = async (id: string) => {
    const isOccupied = contracts.some(c => c.unit_id === id && c.status === 'active');
    if(isOccupied) {
      throw new Error(`Unit ${units.find(u => u.id === id)?.unit_number} has an active contract.`);
    }
    return base44.entities.Unit.delete(id);
  };

  const deleteMutation = useMutation({
    mutationFn: deleteUnit,
    onSuccess: () => {
      queryClient.invalidateQueries(['units']);
    },
    onError: (error: Error) => {
      alert(`Error deleting unit: ${error.message}`);
    }
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      let errors: string[] = [];
      for (const id of ids) {
        try {
          await deleteUnit(id);
        } catch (error: any) {
          errors.push(error.message);
        }
      }
      if (errors.length > 0) {
        throw new Error(`Could not delete all units:\n- ${errors.join('\n- ')}`);
      }
    },
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries(['units']);
    },
    onError: (error: Error) => {
      alert(error.message);
    }
  });

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setShowForm(true);
  };

  const handleDelete = async (unit: Unit) => {
    const confirmed = await confirmDelete({
        title: 'Delete Unit',
        message: `Are you sure you want to delete Unit ${unit.unit_number}?`,
        variant: 'destructive',
        confirmText: 'Delete'
    });
    if (confirmed) {
      deleteMutation.mutate(unit.id);
    }
  };

  const handleDeleteSelected = async () => {
    const confirmed = await confirmDelete({
        title: `Delete ${selectedIds.length} Units`,
        message: `Are you sure you want to delete the ${selectedIds.length} selected units? This action cannot be undone.`,
        variant: 'destructive',
        confirmText: 'Delete'
    });
    if (confirmed) {
      deleteSelectedMutation.mutate(selectedIds);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingUnit(null);
  };

  return (
    <div className="p-6 lg:p-8 bg-slate-50">
      <ConfirmationModal isProcessing={deleteMutation.isPending || deleteSelectedMutation.isPending} />
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Units</h1>
            <p className="text-slate-600 mt-1">Manage individual units within properties</p>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 ? (
              <Button
                onClick={handleDeleteSelected}
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50"
                disabled={deleteSelectedMutation.isPending}
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Delete Selected ({selectedIds.length})
              </Button>
            ) : null}
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Unit
            </Button>
          </div>
        </div>

        {showForm && (
          <UnitForm
            unit={editingUnit}
            properties={properties}
            onClose={handleFormClose}
          />
        )}

        <Card className="shadow-md border-none">
          <CardHeader className="border-b bg-slate-50 p-4">
             <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  <Label htmlFor="statusFilter" className="text-xs">Status</Label>
                  <Select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="w-24 h-8 text-xs bg-white">
                    <option value="all">All</option>
                    <option value="vacant">Vacant</option>
                    <option value="occupied">Occupied</option>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="typeFilter" className="text-xs">Type</Label>
                  <Select id="typeFilter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-24 h-8 text-xs bg-white">
                    <option value="all">Any</option>
                    <option value="Family">Family</option>
                    <option value="Bachelor">Bachelor</option>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="roomFilter" className="text-xs">Rooms</Label>
                  <Select id="roomFilter" value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} className="w-16 h-8 text-xs bg-white">
                    <option value="all">Any</option>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n.toString()}>{n}</option>)}
                  </Select>
                </div>
                 <div className="flex items-center gap-1">
                  <Label htmlFor="hallFilter" className="text-xs">Halls</Label>
                  <Select id="hallFilter" value={hallFilter} onChange={(e) => setHallFilter(e.target.value)} className="w-16 h-8 text-xs bg-white">
                    <option value="all">Any</option>
                    {[0,1,2,3].map(n => <option key={n} value={n.toString()}>{n}</option>)}
                  </Select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <Input 
                    type="search"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setRoomFilter('all'); setHallFilter('all'); setSearchTerm(''); }} className="h-8 text-xs text-slate-500">
                    Clear
                </Button>
              </div>
          </CardHeader>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              All Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UnitTable
              units={filteredUnits}
              properties={properties}
              contracts={contracts}
              tenants={tenants}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
