"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { BUS_PURPOSES, BusPurpose, BUS_CAPACITY } from "@/lib/constants";
import { toast } from "sonner";
import { Info, Bus, ArrowRight } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { useMemberBasePath } from "@/lib/memberPath";

const minNoticeDateStr = (noticeDays: number) => {
  const d = new Date(Date.now() + noticeDays * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
};

const busFormSchema = z
  .object({
    purpose: z.enum(BUS_PURPOSES, {
      errorMap: () => ({ message: "Select trip purpose" }),
    }),
    reason: z
      .string()
      .trim()
      .min(1, "Please give a reason for requesting the bus")
      .max(1000, "Reason cannot exceed 1000 characters"),
    departureAt: z.string().min(1, "Departure date & time is required"),
    returnAt: z.string().min(1, "Return date & time is required"),
    departurePoint: z.string().min(3, "Departure point is required"),
    destination: z.string().min(3, "Destination is required"),
    distanceKm: z.coerce.number().min(1).max(2000).optional(),
    passengers: z
      .coerce
      .number()
      .min(1, "At least 1 passenger required"),
    // Left blank, the trip contact is the member themselves.
    tripContactName: z.string().optional(),
    tripContactPhone: z
      .string()
      .optional()
      .refine((val) => !val || /^(?:\+254|0)?(7\d{8}|1\d{8})$/.test(val), "Valid contact phone required"),
    extraRequirements: z.string().max(400).optional(),
  })
  .refine(
    (data) => new Date(data.returnAt) > new Date(data.departureAt),
    {
      message: "Return date & time must be after departure date & time",
      path: ["returnAt"],
    }
  );

type BusFormData = z.infer<typeof busFormSchema>;

export default function NewBusBookingPage() {
  const router = useRouter();
  const basePath = useMemberBasePath();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createBooking = useMutation(api.busBookings.create);
  const userProfile = useQuery(api.users.getMyProfile);
  const branchConfig = useQuery(api.settings.getBranchConfig);
  const noticeDays = branchConfig?.busNoticeDays ?? 3;
  const capacitySeats = branchConfig?.busCapacitySeats ?? BUS_CAPACITY;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BusFormData>({
    resolver: zodResolver(busFormSchema),
    defaultValues: {
      purpose: "Funeral / Bereavement Procession",
      reason: "",
      departureAt: minNoticeDateStr(3),
      returnAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      departurePoint: "Busia Secretariat Plaza",
      destination: "",
      passengers: 40,
      tripContactName: "",
      tripContactPhone: "",
    },
  });

  const reasonValue = watch("reason") || "";

  const onSubmit = async (data: BusFormData) => {
    const minNoticeDate = new Date(Date.now() + noticeDays * 24 * 60 * 60 * 1000);
    if (new Date(data.departureAt) < minNoticeDate) {
      toast.error(`Bus requests require a minimum ${noticeDays}-day advance notice period.`);
      return;
    }
    if (data.passengers > capacitySeats) {
      toast.error(`Maximum bus capacity is ${capacitySeats} seats.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createBooking({
        purpose: data.purpose as BusPurpose,
        reason: data.reason,
        departureAt: data.departureAt,
        returnAt: data.returnAt,
        departurePoint: data.departurePoint,
        destination: data.destination,
        distanceKm: data.distanceKm,
        passengers: data.passengers,
        tripContactName: data.tripContactName?.trim() || undefined,
        tripContactPhone: data.tripContactPhone?.trim() || undefined,
        extraRequirements: data.extraRequirements,
      });

      toast.success("Bus reservation request submitted successfully.");
      router.push(`${basePath}/bus/${res.bookingId}`);
    } catch (err: unknown) {
      const error = err as { message?: string; data?: { message?: string } };
      toast.error(
        error.data?.message || error.message || "Failed to submit bus request."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[840px] mx-auto">
      <PageHeader
        eyebrow="RESERVE UNION BUS"
        title="Request KUPPET Busia Branch Bus"
        lead="Complete the trip details below. Your details are filled in from your profile. Once the branch office approves, you will be told the amount to pay."
        breadcrumbs={[
          { label: "Dashboard", href: `${basePath}/dashboard` },
          { label: "Union Bus", href: `${basePath}/bus` },
          { label: "New Request" },
        ]}
      />

      {/* Mandatory Disclaimer Banner */}
      <div className="p-4 rounded-[var(--r-md)] bg-[var(--brass-soft)] border border-[var(--brass)]/30 mb-8 flex items-start gap-3.5">
        <Info className="h-5 w-5 text-[var(--brass)] shrink-0 mt-0.5" />
        <div className="text-[15.5px] leading-relaxed text-[var(--ink-body)]">
          <p className="font-semibold text-[var(--ink)]">
            Branch Bus Policy & Capacity Notice:
          </p>
          <p className="text-[var(--ink-muted)] mt-0.5">
            Final approval and availability are confirmed by the branch administrator. The bus has a maximum seating capacity of <strong>{capacitySeats} passengers</strong>. Requests require a minimum {noticeDays}-day notice period.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Requester Info */}
            <div>
              <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] mb-4">
                1. Requester & Institution Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reqName">Requester Full Name</Label>
                  <Input id="reqName" disabled value={userProfile?.fullName ?? ""} className="bg-[var(--surface-sunk)]" />
                </div>

                <div>
                  <Label htmlFor="school">School / Institution</Label>
                  <Input id="school" disabled value={userProfile?.school ?? ""} className="bg-[var(--surface-sunk)]" />
                </div>

                <div>
                  <Label htmlFor="phone">Contact Phone Number</Label>
                  <Input id="phone" disabled value={userProfile?.phone ?? ""} className="bg-[var(--surface-sunk)]" />
                </div>

                <div>
                  <Label htmlFor="passengers">
                    Number of Passengers (Capacity: {capacitySeats} seats) <span className="text-[var(--danger)]">*</span>
                  </Label>
                  <Input
                    id="passengers"
                    type="number"
                    min={1}
                    max={capacitySeats}
                    error={!!errors.passengers}
                    {...register("passengers")}
                  />
                  {errors.passengers && (
                    <p className="text-[14.5px] text-[var(--danger)] mt-1">
                      {errors.passengers.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="h-px bg-[var(--line)] w-full" />

            {/* Trip Details & Purpose */}
            <div>
              <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] mb-4">
                2. Trip Purpose & Mandatory Reason
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purpose">
                    Category of Trip / Function <span className="text-[var(--danger)]">*</span>
                  </Label>
                  <Select
                    defaultValue="Funeral / Bereavement Procession"
                    onValueChange={(val) =>
                      setValue("purpose", val as BusPurpose, {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger id="purpose" error={!!errors.purpose}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUS_PURPOSES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.purpose && (
                    <p className="text-[14.5px] text-[var(--danger)] mt-1">
                      {errors.purpose.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="destination">
                    Destination <span className="text-[var(--danger)]">*</span>
                  </Label>
                  <Input
                    id="destination"
                    placeholder="e.g. Kakamega High School / Nakuru"
                    error={!!errors.destination}
                    {...register("destination")}
                  />
                  {errors.destination && (
                    <p className="text-[14.5px] text-[var(--danger)] mt-1">
                      {errors.destination.message}
                    </p>
                  )}
                </div>

                {/* Mandatory Free-text Reason */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="reason">
                      Reason for Requesting the Union Bus <span className="text-[var(--danger)]">*</span>
                    </Label>
                    <span className="text-[13.5px] text-[var(--ink-muted)]">
                      {reasonValue.length} / 1000 chars
                    </span>
                  </div>
                  <Textarea
                    id="reason"
                    maxLength={1000}
                    rows={4}
                    placeholder="Briefly say why you need the union bus…"
                    error={!!errors.reason}
                    {...register("reason")}
                  />
                  <p className="text-[13px] text-[var(--ink-muted)] mt-1">
                    Eleza kwa ufupi sababu ya kuomba bus la tawi. A reason is required, but it can be short.
                  </p>
                  {errors.reason && (
                    <p className="text-[14.5px] text-[var(--danger)] mt-1">
                      {errors.reason.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="h-px bg-[var(--line)] w-full" />

            {/* Schedule & Itinerary */}
            <div>
              <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] mb-4">
                3. Schedule & Route
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="departureAt">
                    Departure Date & Time <span className="text-[var(--danger)]">*</span>
                  </Label>
                  <Input
                    id="departureAt"
                    type="datetime-local"
                    error={!!errors.departureAt}
                    {...register("departureAt")}
                  />
                  {errors.departureAt && (
                    <p className="text-[14.5px] text-[var(--danger)] mt-1">
                      {errors.departureAt.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="returnAt">
                    Return Date & Time <span className="text-[var(--danger)]">*</span>
                  </Label>
                  <Input
                    id="returnAt"
                    type="datetime-local"
                    error={!!errors.returnAt}
                    {...register("returnAt")}
                  />
                  {errors.returnAt && (
                    <p className="text-[14.5px] text-[var(--danger)] mt-1">
                      {errors.returnAt.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="departurePoint">
                    Departure Pickup Location <span className="text-[var(--danger)]">*</span>
                  </Label>
                  <Input
                    id="departurePoint"
                    placeholder="e.g. Busia Secretariat or School Gate"
                    error={!!errors.departurePoint}
                    {...register("departurePoint")}
                  />
                </div>

                <div>
                  <Label htmlFor="distanceKm" optional>Estimated Distance (One-Way KM)</Label>
                  <Input
                    id="distanceKm"
                    type="number"
                    placeholder="e.g. 150"
                    {...register("distanceKm")}
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-[var(--line)] w-full" />

            {/* Trip Contact */}
            <div>
              <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] mb-4">
                4. On-Trip Contact Person
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tripContactName" optional>
                    Contact Person Name on Bus
                  </Label>
                  <Input
                    id="tripContactName"
                    placeholder="Leave blank to use your own name"
                    error={!!errors.tripContactName}
                    {...register("tripContactName")}
                  />
                </div>

                <div>
                  <Label htmlFor="tripContactPhone" optional>
                    Contact Person Mobile Phone
                  </Label>
                  <Input
                    id="tripContactPhone"
                    placeholder="Leave blank to use your own number"
                    type="tel"
                    error={!!errors.tripContactPhone}
                    {...register("tripContactPhone")}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="extraRequirements" optional>Special Logistics / Extra Requirements</Label>
                  <Textarea
                    id="extraRequirements"
                    maxLength={400}
                    rows={2}
                    placeholder="e.g. Luggage space for sports equipment, early 5:00 AM pickup…"
                    {...register("extraRequirements")}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--line)] flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => router.push(`${basePath}/bus`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                loading={isSubmitting}
                loadingText="Submitting request…"
              >
                <Bus className="h-4 w-4 mr-1.5" /> Submit Bus Reservation Request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

