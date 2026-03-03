import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const AddEmployee = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    position: "",
  });
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: emp, error } = await supabase
        .from("employees")
        .insert({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone || null,
          position: form.position || null,
        })
        .select()
        .single();
      if (error) throw error;

      if (selectedBranches.length > 0) {
        const { error: linkError } = await supabase.from("employee_branches").insert(
          selectedBranches.map((branchId) => ({
            employee_id: emp.id,
            branch_id: branchId,
          }))
        );
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      toast.success("Employee added successfully!");
      setForm({ first_name: "", last_name: "", email: "", phone: "", position: "" });
      setSelectedBranches([]);
      queryClient.invalidateQueries({ queryKey: ["employees-with-branches"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add employee");
    },
  });

  const toggleBranch = (branchId: string) => {
    setSelectedBranches((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    );
  };

  return (
    <AppLayout>
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Employee</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create a new employee and assign to branches
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="bg-card border rounded-lg p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Assign to Branches</Label>
            {branches?.length === 0 && (
              <p className="text-sm text-muted-foreground">No branches yet. Add one first.</p>
            )}
            <div className="space-y-2">
              {branches?.map((branch) => (
                <label
                  key={branch.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedBranches.includes(branch.id)}
                    onCheckedChange={() => toggleBranch(branch.id)}
                  />
                  <span className="text-sm">
                    {branch.name}
                    {branch.location && (
                      <span className="text-muted-foreground"> — {branch.location}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? "Adding..." : "Add Employee"}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
};

export default AddEmployee;
