export async function loadYaml(filePath, parser = jsyaml.load) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${filePath}. Status: ${response.status}`);
    }
    const text = await response.text();
    return parser(text);
  } catch (error) {
    console.error(`Error loading YAML file from ${filePath}:`, error);
    throw error;
  }
}
