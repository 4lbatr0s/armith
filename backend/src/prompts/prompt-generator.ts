import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PromptGenerator {
    private static templateCache: Map<string, Handlebars.TemplateDelegate> = new Map();

    static generateIdCardPrompt(config: any): string {
        const countryCode = config.countryCode.toLowerCase();
        const templatePath = path.join(__dirname, countryCode, 'id-card.v1.yaml');

        if (!fs.existsSync(templatePath)) {
            // Fallback to TR if not found
            return this.generateFromPath(path.join(__dirname, 'tr', 'id-card.v1.yaml'), config);
        }

        return this.generateFromPath(templatePath, config);
    }

    private static generateFromPath(filePath: string, config: any): string {
        try {
            const cacheKey = filePath;
            let template = this.templateCache.get(cacheKey);

            if (!template) {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const parsedYaml: any = yaml.load(fileContent);

                // Assume the prompt text is in a specific field in YAML
                const promptString = parsedYaml.prompt || parsedYaml.system_prompt || JSON.stringify(parsedYaml);
                template = Handlebars.compile(promptString);
                this.templateCache.set(cacheKey, template);
            }

            return template(config);
        } catch (error: any) {
            console.error(`Error generating prompt from ${filePath}:`, error);
            throw new Error(`Failed to generate prompt: ${error.message}`);
        }
    }
}
