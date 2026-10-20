"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getVehicleMakes,
  createVehicleMake,
  updateVehicleMake,
  deleteVehicleMake,
  getVehicleModels,
  createVehicleModel,
  updateVehicleModel,
  deleteVehicleModel,
} from "@/actions/vehicleActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import DeleteConfirmDialog from "@/components/products/DeleteConfirmDialog";
import { toast } from "sonner";
import {
  Bike,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  Loader2,
  Search,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VehicleMakeItem {
  _id: string;
  name: string;
  modelCount: number;
}

interface VehicleModelItem {
  _id: string;
  name: string;
  make: { _id: string; name: string };
  productFitmentCount: number;
}

export default function VehicleTab() {
  const queryClient = useQueryClient();
  const [selectedMakeId, setSelectedMakeId] = useState<string>("");
  const [makeSearch, setMakeSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");

  // Make dialogs
  const [makeModalOpen, setMakeModalOpen] = useState(false);
  const [editingMake, setEditingMake] = useState<VehicleMakeItem | null>(null);
  const [makeName, setMakeName] = useState("");
  const [savingMake, setSavingMake] = useState(false);

  // Model dialogs
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<VehicleModelItem | null>(null);
  const [modelName, setModelName] = useState("");
  const [modelMakeId, setModelMakeId] = useState("");
  const [savingModel, setSavingModel] = useState(false);

  // Deletions
  const [deleteMakeOpen, setDeleteMakeOpen] = useState(false);
  const [deletingMake, setDeletingMake] = useState<VehicleMakeItem | null>(null);
  const [deletingMakeState, setDeletingMakeState] = useState(false);

  const [deleteModelOpen, setDeleteModelOpen] = useState(false);
  const [deletingModel, setDeletingModel] = useState<VehicleModelItem | null>(null);
  const [deletingModelState, setDeletingModelState] = useState(false);

  // Queries
  const { data: makes = [], isLoading: makesLoading } = useQuery<VehicleMakeItem[]>({
    queryKey: ["vehicle-makes"],
    queryFn: async () => await getVehicleMakes(),
  });

  const activeMakeId =
    selectedMakeId || (makes.length > 0 ? makes[0]._id : "");

  const { data: models = [], isLoading: modelsLoading } = useQuery<VehicleModelItem[]>({
    queryKey: ["vehicle-models", activeMakeId],
    queryFn: async () => {
      if (!activeMakeId) return [];
      return await getVehicleModels(activeMakeId);
    },
    enabled: Boolean(activeMakeId),
  });

  const activeMakeObj = makes.find((m) => m._id === activeMakeId);

  // Make actions
  const handleOpenCreateMake = () => {
    setEditingMake(null);
    setMakeName("");
    setMakeModalOpen(true);
  };

  const handleOpenEditMake = (make: VehicleMakeItem) => {
    setEditingMake(make);
    setMakeName(make.name);
    setMakeModalOpen(true);
  };

  const handleSaveMake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!makeName.trim()) {
      toast.error("Make name is required.");
      return;
    }

    setSavingMake(true);
    try {
      if (editingMake) {
        const res = await updateVehicleMake(editingMake._id, {
          name: makeName.trim(),
        });
        if (!res.success) {
          toast.error(res.error || "Failed to update make.");
          return;
        }
        toast.success(`Make "${makeName}" updated!`);
      } else {
        const res = await createVehicleMake({
          name: makeName.trim(),
        });
        if (!res.success) {
          toast.error(res.error || "Failed to create make.");
          return;
        }
        toast.success(`Make "${makeName}" created!`);
      }

      queryClient.invalidateQueries({ queryKey: ["vehicle-makes"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-models"] });
      setMakeModalOpen(false);
    } catch {
      toast.error("An error occurred while saving make.");
    } finally {
      setSavingMake(false);
    }
  };

  const handleDeleteMake = async () => {
    if (!deletingMake) return;
    setDeletingMakeState(true);
    try {
      const res = await deleteVehicleMake(deletingMake._id);
      if (!res.success) {
        toast.error(res.error || "Failed to delete make.");
        return;
      }
      toast.success(`Make "${deletingMake.name}" deleted.`);
      queryClient.invalidateQueries({ queryKey: ["vehicle-makes"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-models"] });
      setDeleteMakeOpen(false);
    } catch {
      toast.error("Error deleting make.");
    } finally {
      setDeletingMakeState(false);
    }
  };

  // Model actions
  const handleOpenCreateModel = () => {
    if (!activeMakeId) {
      toast.error("Please select a vehicle make first.");
      return;
    }
    setEditingModel(null);
    setModelName("");
    setModelMakeId(activeMakeId);
    setModelModalOpen(true);
  };

  const handleOpenEditModel = (model: VehicleModelItem) => {
    setEditingModel(model);
    setModelName(model.name);
    setModelMakeId(model.make?._id || activeMakeId);
    setModelModalOpen(true);
  };

  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName.trim()) {
      toast.error("Model name is required.");
      return;
    }
    if (!modelMakeId) {
      toast.error("Vehicle make is required.");
      return;
    }

    setSavingModel(true);
    try {
      if (editingModel) {
        const res = await updateVehicleModel(editingModel._id, {
          name: modelName.trim(),
          make: modelMakeId,
        });
        if (!res.success) {
          toast.error(res.error || "Failed to update model.");
          return;
        }
        toast.success(`Model "${modelName}" updated!`);
      } else {
        const res = await createVehicleModel({
          name: modelName.trim(),
          make: modelMakeId,
        });
        if (!res.success) {
          toast.error(res.error || "Failed to create model.");
          return;
        }
        toast.success(`Model "${modelName}" created under ${activeMakeObj?.name}!`);
      }

      queryClient.invalidateQueries({ queryKey: ["vehicle-models"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-makes"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setModelModalOpen(false);
    } catch {
      toast.error("An error occurred while saving model.");
    } finally {
      setSavingModel(false);
    }
  };

  const handleDeleteModel = async () => {
    if (!deletingModel) return;
    setDeletingModelState(true);
    try {
      const res = await deleteVehicleModel(deletingModel._id);
      if (!res.success) {
        toast.error(res.error || "Failed to delete model.");
        return;
      }
      toast.success(`Model "${deletingModel.name}" deleted.`);
      queryClient.invalidateQueries({ queryKey: ["vehicle-models"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-makes"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeleteModelOpen(false);
    } catch {
      toast.error("Error deleting model.");
    } finally {
      setDeletingModelState(false);
    }
  };

  const filteredMakes = makes.filter((m) =>
    m.name.toLowerCase().includes(makeSearch.toLowerCase())
  );

  const filteredModels = models.filter((m) =>
    m.name.toLowerCase().includes(modelSearch.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Vehicle Makes (4 cols) */}
      <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-4 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Bike className="size-5 text-primary" />
            <div>
              <h3 className="font-bold text-foreground text-sm sm:text-base">
                Vehicle Makes
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Manufacturers (Bajaj, TVS, Honda)
              </p>
            </div>
          </div>
          <Button onClick={handleOpenCreateMake} size="sm" className="gap-1 text-xs">
            <Plus className="size-3.5" /> Add Make
          </Button>
        </div>

        {/* Make search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search makes..."
            value={makeSearch}
            onChange={(e) => setMakeSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        {/* Makes list */}
        <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
          {makesLoading ? (
            <div className="py-8 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>Loading makes...</span>
            </div>
          ) : filteredMakes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs">
              No vehicle makes found.
            </div>
          ) : (
            filteredMakes.map((make) => {
              const isActive = make._id === activeMakeId;
              return (
                <div
                  key={make._id}
                  onClick={() => setSelectedMakeId(make._id)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border",
                    isActive
                      ? "bg-primary/10 border-primary/40 shadow-xs"
                      : "bg-muted/30 border-border hover:bg-muted/60"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        isActive ? "bg-primary" : "bg-muted-foreground/40"
                      )}
                    />
                    <div>
                      <p className={cn("text-sm font-bold", isActive ? "text-primary" : "text-foreground")}>
                        {make.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {make.modelCount} {make.modelCount === 1 ? "model" : "models"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditMake(make);
                      }}
                      className="h-7 w-7 p-0 hover:text-primary"
                    >
                      <Edit2 className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingMake(make);
                        setDeleteMakeOpen(true);
                      }}
                      className="h-7 w-7 p-0 hover:text-destructive text-muted-foreground"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                    <ChevronRight
                      className={cn(
                        "size-4 ml-1",
                        isActive ? "text-primary" : "text-muted-foreground/40"
                      )}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Vehicle Models under selected Make (7 cols) */}
      <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-4 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="size-5 text-primary" />
              <h3 className="font-bold text-foreground text-sm sm:text-base">
                Models for <span className="text-primary">{activeMakeObj?.name || "Make"}</span>
              </h3>
              <Badge variant="brand">{models.length} Models</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Specific vehicle models referenced when assigning product compatibility.
            </p>
          </div>

          <Button
            onClick={handleOpenCreateModel}
            size="sm"
            disabled={!activeMakeId}
            className="gap-1.5 shrink-0"
          >
            <Plus className="size-3.5" /> Add Model
          </Button>
        </div>

        {/* Model search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${activeMakeObj?.name || ""} models...`}
            value={modelSearch}
            onChange={(e) => setModelSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Models Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-bold">Model Name</TableHead>
                <TableHead className="font-bold text-center">Compatible Products</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modelsLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-5 animate-spin text-primary" />
                      <span>Loading models...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !activeMakeId ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                    Select a vehicle make from the left to view models.
                  </TableCell>
                </TableRow>
              ) : filteredModels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                      <Bike className="size-7 text-muted-foreground/60" />
                      <p className="font-medium text-foreground">
                        No models found for {activeMakeObj?.name}
                      </p>
                      <Button onClick={handleOpenCreateModel} size="sm" variant="outline" className="mt-1">
                        <Plus className="size-3.5 mr-1" /> Add Model
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredModels.map((model) => (
                  <TableRow key={model._id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-primary" />
                        <span>{model.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono text-xs">
                        {model.productFitmentCount} parts
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditModel(model)}
                          className="h-8 w-8 p-0 hover:text-primary"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingModel(model);
                            setDeleteModelOpen(true);
                          }}
                          className="h-8 w-8 p-0 hover:text-destructive text-muted-foreground"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add / Edit Vehicle Make Dialog */}
      <Dialog open={makeModalOpen} onOpenChange={setMakeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bike className="size-5 text-primary" />
              {editingMake ? "Edit Vehicle Make" : "Add Vehicle Make"}
            </DialogTitle>
            <DialogDescription>
              Vehicle manufacturer (e.g. Bajaj, TVS, Honda, Yamaha).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMake} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="make-name">
                Make Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="make-name"
                placeholder="e.g. Bajaj, TVS, Honda, Haojue"
                value={makeName}
                onChange={(e) => setMakeName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMakeModalOpen(false)}
                disabled={savingMake}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingMake} className="gap-2">
                {savingMake && <Loader2 className="size-4 animate-spin" />}
                {editingMake ? "Save Changes" : "Create Make"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Vehicle Model Dialog */}
      <Dialog open={modelModalOpen} onOpenChange={setModelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-5 text-primary" />
              {editingModel ? "Edit Vehicle Model" : "Add Vehicle Model"}
            </DialogTitle>
            <DialogDescription>
              A specific vehicle model belonging to a manufacturer.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveModel} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="model-make">Vehicle Make</Label>
              <Select
                value={modelMakeId}
                onValueChange={(val) => setModelMakeId(val)}
              >
                <SelectTrigger id="model-make">
                  <SelectValue placeholder="Select manufacturer" />
                </SelectTrigger>
                <SelectContent>
                  {makes.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model-name">
                Model Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="model-name"
                placeholder="e.g. Boxer BM150, HLX 125, CG 125"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModelModalOpen(false)}
                disabled={savingModel}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingModel} className="gap-2">
                {savingModel && <Loader2 className="size-4 animate-spin" />}
                {editingModel ? "Save Changes" : "Create Model"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Make Confirmation */}
      <DeleteConfirmDialog
        open={deleteMakeOpen}
        onOpenChange={setDeleteMakeOpen}
        title="Delete Vehicle Make"
        description={
          deletingMake
            ? `Are you sure you want to delete make "${deletingMake.name}"? This will be safely rejected if any vehicle models currently belong to it.`
            : ""
        }
        onConfirm={handleDeleteMake}
        loading={deletingMakeState}
      />

      {/* Delete Model Confirmation */}
      <DeleteConfirmDialog
        open={deleteModelOpen}
        onOpenChange={setDeleteModelOpen}
        title="Delete Vehicle Model"
        description={
          deletingModel
            ? `Are you sure you want to delete model "${deletingModel.name}"? This will be safely rejected if any product fitments reference it.`
            : ""
        }
        onConfirm={handleDeleteModel}
        loading={deletingModelState}
      />
    </div>
  );
}
