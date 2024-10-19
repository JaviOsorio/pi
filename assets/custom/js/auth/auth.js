export const decodeToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return "";
  const payload = token.split(".")[1]; // Obtener la segunda parte del JWT (el payload)
  const decodedPayload = atob(payload); // Decodificar de Base64 a string
  const result = JSON.parse(decodedPayload); // Convertir el string en un objeto JSON
  result.token = token;
  return result;
};

export const logout = () => {
  localStorage.removeItem("token");
};
