import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templateCache = new Map();
function buildCustomThresholdEntries(customThresholds) {
    if (!customThresholds || typeof customThresholds !== 'object')
        return [];
    return Object.entries(customThresholds).map(([key, threshold]) => {
        const t = threshold;
        return {
            key,
            value: t?.value,
            type: t?.type ?? 'unknown',
            description: t?.description ? ` - ${t.description}` : ''
        };
    });
}
function preparePromptContext(config) {
    const customThresholdEntries = buildCustomThresholdEntries(config.customThresholds);
    const st = config.selfieThresholds;
    return {
        ...config,
        customThresholdEntries,
        hasCustomThresholds: customThresholdEntries.length > 0,
        spoofRiskFormatted: st?.maxSpoofingRisk != null ? Number(st.maxSpoofingRisk).toFixed(2) : '0',
        selfieQualityFormatted: st?.minImageQuality != null ? Number(st.minImageQuality).toFixed(2) : '0',
        livenessConfidenceFormatted: st?.minLivenessConfidence != null ? Number(st.minLivenessConfidence).toFixed(2) : '0',
        facialFeatureFormatted: st?.minFacialFeatureConfidence != null ? Number(st.minFacialFeatureConfidence).toFixed(2) : '0'
    };
}
function compileYamlTemplate(filePath) {
    let template = templateCache.get(filePath);
    if (template)
        return template;
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = yaml.load(fileContent);
    const promptString = parsed.prompt ?? parsed.system_prompt ?? '';
    if (!promptString) {
        throw new Error(`No prompt field in YAML: ${filePath}`);
    }
    template = Handlebars.compile(promptString);
    templateCache.set(filePath, template);
    return template;
}
export function generateIdCardPrompt(config) {
    const ctx = preparePromptContext(config);
    const countryCode = String(ctx.countryCode ?? 'TR').toLowerCase();
    let yamlPath = path.join(__dirname, 'countries', countryCode, 'id-card.v1.yaml');
    if (!fs.existsSync(yamlPath)) {
        yamlPath = path.join(__dirname, 'countries', 'tr', 'id-card.v1.yaml');
    }
    return compileYamlTemplate(yamlPath)(ctx);
}
export function generateSelfiePrompt(config) {
    const ctx = preparePromptContext(config);
    const yamlPath = path.join(__dirname, 'selfie', 'selfie.v1.yaml');
    return compileYamlTemplate(yamlPath)(ctx);
}
