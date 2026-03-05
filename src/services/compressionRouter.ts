export function detectFormat(file: File) {

  if (file.type === "image/png")
    return "png"

  if (file.type === "image/jpeg")
    return "jpeg"

  if (file.type === "image/webp")
    return "webp"

  return "jpeg"
}
