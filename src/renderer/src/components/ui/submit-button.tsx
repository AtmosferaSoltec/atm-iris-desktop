import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./button";

/** Submit button that shows a spinner while its parent form's action runs. */
export function SubmitButton(props: Omit<ComponentProps<typeof Button>, "type" | "isLoading">) {
  const { pending } = useFormStatus();
  return <Button type="submit" isLoading={pending} {...props} />;
}
