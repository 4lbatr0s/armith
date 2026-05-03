import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templateCache = new Map<string, Handlebars.TemplateDelegate>();

function buildCustomThresholdEntries(customThresholds: Record<string, unknown> | undefined) {
    if (!customThresholds || typeof customThresholds !== 'object') return [];
    return Object.entries(customThresholds).map(([key, threshold]) => {
        const t = threshold as { value?: unknown; type?: string; description?: string };
        return {
            key,
            value: t?.value,
            type: t?.type ?? 'unknown',
            description: t?.description ? ` - ${t.description}` : ''
        };
    });
}

function preparePromptContext(config: Record<string, unknown>): Record<string, unknown> {
    const customThresholdEntries = buildCustomThresholdEntries(
        config.customThresholds as Record<string, unknown> | undefined
    );
    const st = config.selfieThresholds as Record<string, number> | undefined;
    return {
        ...config,
        customThresholdEntries,
        hasCustomThresholds: customThresholdEntries.length > 0,
        spoofRiskFormatted: st?.maxSpoofingRisk != null ? Number(st.maxSpoofingRisk).toFixed(2) : '0',
        selfieQualityFormatted: st?.minImageQuality != null ? Number(st.minImageQuality).toFixed(2) : '0',
        livenessConfidenceFormatted:
            st?.minLivenessConfidence != null ? Number(st.minLivenessConfidence).toFixed(2) : '0',
        facialFeatureFormatted:
            st?.minFacialFeatureConfidence != null ? Number(st.minFacialFeatureConfidence).toFixed(2) : '0'
    } as Record<string, unknown>;
}

function compileYamlTemplate(filePath: string): Handlebars.TemplateDelegate {
    let template = templateCache.get(filePath);
    if (template) return template;
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = yaml.load(fileContent) as { prompt?: string; system_prompt?: string };
    const promptString = parsed.prompt ?? parsed.system_prompt ?? '';
    if (!promptString) {
        throw new Error(`No prompt field in YAML: ${filePath}`);
    }
    template = Handlebars.compile(promptString);
    templateCache.set(filePath, template);
    return template;
}

export function generateIdCardPrompt(config: Record<string, unknown>): string {
    const ctx = preparePromptContext(config);
    const countryCode = String(ctx.countryCode ?? 'TR').toLowerCase();
    let yamlPath = path.join(__dirname, 'countries', countryCode, 'id-card.v1.yaml');
    if (!fs.existsSync(yamlPath)) {
        yamlPath = path.join(__dirname, 'countries', 'tr', 'id-card.v1.yaml');
    }
    return compileYamlTemplate(yamlPath)(ctx);
}

export function generateSelfiePrompt(config: Record<string, unknown>): string {
    const ctx = preparePromptContext(config);
    const yamlPath = path.join(__dirname, 'selfie', 'selfie.v1.yaml');
    return compileYamlTemplate(yamlPath)(ctx);
}
