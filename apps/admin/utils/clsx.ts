export function clsx(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(" ");
}