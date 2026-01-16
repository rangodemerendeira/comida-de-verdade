export async function gerarReceitas(alimentos: string[]) {
  try {
    const response = await fetch(
      "https://comida-de-verdade.vercel.app/api/gerar-receitas",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alimentos }),
      }
    );

    if (!response.ok) {
      // Isso vai nos dizer se foi erro 404, 500, 401, etc.
      const errorBody = await response.text();
      console.error("Erro na API da Vercel:", response.status, errorBody);
      throw new Error(`Erro do Servidor: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Erro de Rede ou Fetch:", error);
    throw error;
  }


}
