import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Pencil } from "lucide-react";

const AddBranch = () => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");

  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("branches").insert({ name, location: location || null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Branch added!");
      setName("");
      setLocation("");
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("employee_branches").delete().eq("branch_id", id);
      const { error } = await supabase.from("branches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Branch deleted");
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["employees-with-branches"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("branches")
        .update({ name: editName, location: editLocation || null })
        .eq("id", editingBranch.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Branch updated");
      setEditingBranch(null);
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["employees-with-branches"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openEdit = (branch: any) => {
    setEditingBranch(branch);
    setEditName(branch.name);
    setEditLocation(branch.location || "");
  };

  return (
    <AppLayout>
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Branch</h1>
          <p className="text-muted-foreground text-sm mt-1">Create and manage branches</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMutation.mutate();
          }}
          className="bg-card border rounded-lg p-6 space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Branch Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Downtown Office" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. New York, NY" />
          </div>
          <Button type="submit" disabled={addMutation.isPending} className="w-full">
            {addMutation.isPending ? "Adding..." : "Add Branch"}
          </Button>
        </form>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Existing Branches</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : branches?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No branches yet.</p>
          ) : (
            <div className="space-y-2">
              {branches?.map((branch) => (
                <div key={branch.id} className="bg-card border rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{branch.name}</p>
                    {branch.location && <p className="text-xs text-muted-foreground">{branch.location}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(branch)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(branch.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!editingBranch} onOpenChange={(open) => !open && setEditingBranch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Branch Name *</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
            </div>
            <Button type="submit" disabled={updateMutation.isPending} className="w-full">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default AddBranch;
