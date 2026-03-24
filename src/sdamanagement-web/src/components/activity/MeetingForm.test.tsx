import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor, futureDate } from "@/test-utils";
import { MeetingForm, type MeetingFormProps } from "./MeetingForm";

const ZOOM_DATE = futureDate(30);
const PHYSICAL_DATE = futureDate(45);
const VALIDATION_DATE = futureDate(60);

const defaultProps: MeetingFormProps = {
  departmentId: 1,
  onSubmit: vi.fn(),
  isPending: false,
};

function renderMeetingForm(overrides?: Partial<MeetingFormProps>) {
  return render(<MeetingForm {...defaultProps} {...overrides} />);
}

describe("MeetingForm", () => {
  it("renders all base form fields", () => {
    renderMeetingForm();

    // Title
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    // Description
    expect(screen.getByLabelText("Description (optional)")).toBeInTheDocument();
    // Date
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    // Start / End time
    expect(screen.getByLabelText("Start Time")).toBeInTheDocument();
    expect(screen.getByLabelText("End Time")).toBeInTheDocument();
    // Meeting type radios
    expect(screen.getByLabelText("Zoom")).toBeInTheDocument();
    expect(screen.getByLabelText("Physical")).toBeInTheDocument();
    // Submit button
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("shows Zoom link field when Zoom type selected", async () => {
    const user = userEvent.setup();
    renderMeetingForm();

    // Zoom link should not be visible initially
    expect(screen.queryByLabelText("Zoom Link")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Zoom"));

    expect(screen.getByLabelText("Zoom Link")).toBeInTheDocument();
  });

  it("shows location fields when Physical type selected", async () => {
    const user = userEvent.setup();
    renderMeetingForm();

    // Location fields should not be visible initially
    expect(screen.queryByLabelText("Location Name")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Address")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Physical"));

    expect(screen.getByLabelText("Location Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Address")).toBeInTheDocument();
  });

  it("hides Zoom field when Physical selected after Zoom", async () => {
    const user = userEvent.setup();
    renderMeetingForm();

    // Select Zoom first
    await user.click(screen.getByLabelText("Zoom"));
    expect(screen.getByLabelText("Zoom Link")).toBeInTheDocument();

    // Switch to Physical
    await user.click(screen.getByLabelText("Physical"));

    // Zoom link should be gone; location fields should appear
    expect(screen.queryByLabelText("Zoom Link")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Location Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Address")).toBeInTheDocument();
  });

  it("submits valid Zoom meeting data", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderMeetingForm({ onSubmit });

    // Fill title
    await user.type(screen.getByLabelText("Title"), "Weekly Zoom Sync");

    // Fill date
    await user.type(screen.getByLabelText("Date"), ZOOM_DATE);

    // Fill times
    await user.type(screen.getByLabelText("Start Time"), "14:00");
    await user.type(screen.getByLabelText("End Time"), "15:00");

    // Select Zoom
    await user.click(screen.getByLabelText("Zoom"));

    // Fill Zoom link
    await user.type(
      screen.getByLabelText("Zoom Link"),
      "https://zoom.us/j/123456789"
    );

    // Submit the form
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const submittedData = onSubmit.mock.calls[0][0];
    expect(submittedData).toMatchObject({
      title: "Weekly Zoom Sync",
      date: ZOOM_DATE,
      startTime: "14:00",
      endTime: "15:00",
      meetingType: "zoom",
      zoomLink: "https://zoom.us/j/123456789",
      isMeeting: true,
      visibility: "authenticated",
      departmentId: 1,
    });
  });

  it("submits valid Physical meeting data", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderMeetingForm({ onSubmit });

    await user.type(screen.getByLabelText("Title"), "Planning Session");
    await user.type(screen.getByLabelText("Date"), PHYSICAL_DATE);
    await user.type(screen.getByLabelText("Start Time"), "18:30");
    await user.type(screen.getByLabelText("End Time"), "20:00");

    await user.click(screen.getByLabelText("Physical"));
    await user.type(screen.getByLabelText("Location Name"), "Salle communautaire");
    await user.type(screen.getByLabelText("Address"), "123 rue Principale");

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const submittedData = onSubmit.mock.calls[0][0];
    expect(submittedData).toMatchObject({
      title: "Planning Session",
      date: PHYSICAL_DATE,
      meetingType: "physical",
      locationName: "Salle communautaire",
      locationAddress: "123 rue Principale",
      isMeeting: true,
      visibility: "authenticated",
      departmentId: 1,
    });
  });

  it("shows validation errors for missing required fields", async () => {
    const user = userEvent.setup();
    renderMeetingForm();

    // Submit empty form — trigger validation
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      // Title is required
      expect(screen.getByText(/titre est requis/i)).toBeInTheDocument();
    });
  });

  it("shows meetingType required error when isMeeting but no type selected", async () => {
    const user = userEvent.setup();
    renderMeetingForm();

    // Fill required fields but skip meetingType
    await user.type(screen.getByLabelText("Title"), "Test Meeting");
    await user.type(screen.getByLabelText("Date"), VALIDATION_DATE);
    await user.type(screen.getByLabelText("Start Time"), "10:00");
    await user.type(screen.getByLabelText("End Time"), "11:00");

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText(/type de réunion est requis/i)).toBeInTheDocument();
    });
  });

  it("disables submit button when isPending is true", () => {
    renderMeetingForm({ isPending: true });
    expect(screen.getByRole("button", { name: /Saving/i })).toBeDisabled();
  });
});
