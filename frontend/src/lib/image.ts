const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_DATA_URL_BYTES = 84 * 1024;
const MAX_EDGE = 1440;

export async function compressImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem.');
  if (file.size > MAX_FILE_BYTES) throw new Error('A imagem deve ter no máximo 12 MB.');

  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Não foi possível abrir esta imagem.'));
    });
    if (image.naturalWidth * image.naturalHeight > 80_000_000) {
      throw new Error('A resolução da imagem é muito alta. Redimensione-a antes de enviar.');
    }

    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível processar a imagem neste navegador.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.82, 0.72, 0.62, 0.5, 0.38]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (!blob) continue;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Falha ao ler a imagem.'));
        reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
        reader.readAsDataURL(blob);
      });
      if (new Blob([dataUrl]).size <= MAX_DATA_URL_BYTES) return dataUrl;
    }

    throw new Error('Não foi possível reduzir a imagem o suficiente. Escolha uma imagem menor.');
  } finally {
    URL.revokeObjectURL(source);
  }
}
