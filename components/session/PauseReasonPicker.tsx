"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

const REASONS = ["Break", "Phone Call", "Lunch", "Washroom", "Custom"] as const;

type PauseReasonPickerProps = {
  open: boolean;
  onCancel: () => void;
  onSelect: (reason: string | null) => void;
};

export function PauseReasonPicker({
  open,
  onCancel,
  onSelect,
}: PauseReasonPickerProps) {
  const [custom, setCustom] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <Modal open={open} title="Taking a pause?" onClose={onCancel}>
      <p className="text-caption">Optional — only if you want to remember why.</p>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {REASONS.map((reason) => (
          <Button
            key={reason}
            variant={picked === reason ? "selected" : "secondary"}
            onClick={() => setPicked(reason)}
          >
            {reason}
          </Button>
        ))}
      </div>
      {picked === "Custom" ? (
        <div className="mt-3">
          <Input
            placeholder="What kind of pause?"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        </div>
      ) : null}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button
          className="w-full"
          onClick={() =>
            onSelect(
              picked === "Custom" ? custom || "Custom" : picked,
            )
          }
        >
          Pause timer
        </Button>
        <Button variant="ghost" className="w-full" onClick={onCancel}>
          Keep studying
        </Button>
      </div>
    </Modal>
  );
}
