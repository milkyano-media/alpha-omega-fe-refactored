"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import FormSubmissionService from "@/lib/form-submission-service";
import toast from 'react-hot-toast';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Name is required" })
    .max(100, { message: "Name must not exceed 100 characters" }),
  email: z
    .string()
    .email({ message: "Please enter a valid email address" })
    .toLowerCase(),
  project: z
    .string()
    .min(1, { message: "Project description is required" })
    .max(200, { message: "Project description must not exceed 200 characters" }),
  budget: z
    .string()
    .optional(),
  message: z
    .string()
    .min(1, { message: "Please provide project details" })
    .max(1000, { message: "Message must not exceed 1000 characters" }),
});

export function ProjectInquiryForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      project: "",
      budget: "",
      message: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);

    try {
      // Submit using the form submission service
      await FormSubmissionService.submitProjectInquiry({
        name: values.name,
        email: values.email,
        project: values.project,
        budget: values.budget,
        message: values.message
      });

      // Show success toast
      toast.success("Thank you for your project inquiry! We'll be in touch soon.", {
        duration: 5000,
        position: 'top-center',
      });

      // Reset form
      form.reset();
    } catch (error: any) {
      console.error("Error submitting project inquiry:", error);

      // Extract error message from API response or use default
      const errorMessage = error.response?.data?.message ||
                          error.message ||
                          "Failed to submit project inquiry. Please try again.";

      // Show error toast
      toast.error(errorMessage, {
        duration: 5000,
        position: 'top-center',
      });

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Project Inquiry</h2>
        <p className="text-gray-600 mt-2">
          Tell us about your project
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Darwin Prayoga" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="darwin@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="project"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Type</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Website Redesign"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="5,000 USD"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Details</FormLabel>
                <FormControl>
                  <textarea
                    placeholder="Describe your project requirements..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Submitting..." : "Submit Inquiry"}
          </Button>

          <p className="text-xs text-center text-gray-500">
            This form will be sent to the configured email address and saved to your spreadsheet.
          </p>
        </form>
      </Form>
    </div>
  );
}