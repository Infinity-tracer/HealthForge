import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Doctor } from "@shared/schema";

const consentFormSchema = z.object({
  doctorId: z.string().min(1, "Please select a doctor"),
  permissions: z.array(z.enum(["READ", "WRITE", "SHARE"])).min(1, "Select at least one permission"),
  startDate: z.string().min(1, "Start date required"),
  endDate: z.string().min(1, "End date required"),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
  message: "End date must be after start date",
  path: ["endDate"],
});

type ConsentFormData = z.infer<typeof consentFormSchema>;

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ConsentFormData) => void;
  doctors: Doctor[];
  isLoading?: boolean;
}

const permissionOptions = [
  { value: "READ" as const, label: "Read", description: "View medical records" },
  { value: "WRITE" as const, label: "Write", description: "Add notes and updates" },
  { value: "SHARE" as const, label: "Share", description: "Share with other healthcare providers" },
];

export function ConsentModal({
  isOpen,
  onClose,
  onSubmit,
  doctors,
  isLoading,
}: ConsentModalProps) {
  const form = useForm<ConsentFormData>({
    resolver: zodResolver(consentFormSchema),
    defaultValues: {
      doctorId: "",
      permissions: [],
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    },
  });

  const handleSubmit = (data: ConsentFormData) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Grant Consent to Doctor
          </DialogTitle>
          <DialogDescription>
            Control who can access your medical records and what they can do with them.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="doctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Doctor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-consent-doctor">
                        <SelectValue placeholder="Choose a doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          <div className="flex flex-col">
                            <span>{doctor.fullName}</span>
                            <span className="text-xs text-muted-foreground">
                              {doctor.specialization}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permissions"
              render={() => (
                <FormItem>
                  <FormLabel>Permissions</FormLabel>
                  <div className="space-y-3">
                    {permissionOptions.map((permission) => (
                      <FormField
                        key={permission.value}
                        control={form.control}
                        name="permissions"
                        render={({ field }) => (
                          <FormItem className="flex items-start gap-3 space-y-0 rounded-lg border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(permission.value)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, permission.value]);
                                  } else {
                                    field.onChange(
                                      current.filter((v) => v !== permission.value)
                                    );
                                  }
                                }}
                                data-testid={`checkbox-permission-${permission.value.toLowerCase()}`}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="cursor-pointer font-medium">
                                {permission.label}
                              </FormLabel>
                              <p className="text-sm text-muted-foreground">
                                {permission.description}
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-consent-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-consent-end-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                data-testid="button-cancel-consent"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
                data-testid="button-grant-consent"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Granting...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Grant Consent
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
