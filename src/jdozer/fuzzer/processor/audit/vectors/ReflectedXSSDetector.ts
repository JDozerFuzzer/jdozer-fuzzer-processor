import { UUID } from 'crypto';
import { FuzzerResponse, SecurityEvidence, SeverityLevel, Vector } from '../Types';
import { Logger } from '@nestjs/common';


export class ReflectedXSSDetector {

    private readonly log: Logger = new Logger(ReflectedXSSDetector.name);
    private readonly MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB para evitar problemas

    /**
     * Analiza si hay XSS reflejado comparando el payload original con la respuesta
     */
    analyze(
        xssPayload: Vector,
        response: FuzzerResponse,
        endpoint: string,
        method: string
    ): SecurityValidation | null {

        // 1. Decodificar el script XSS original
        const originalScript = this.decodeBase64(xssPayload.script);
        if (!originalScript) {
            this.log.warn(`Script for payload could not be decoded ${xssPayload.id}`);
            return null;
        }

        /**
        // 2. Extraer el payload enviado (base64 del request)
        const sentPayload = this.decodeBase64(response.payload);
        if (!sentPayload) {
            this.log.warn(`The payload sent for the request could not be decoded. ${response.uuidReq}`);
            return null;
        }
             */

        // 3. Obtener el body de la respuesta
        const responseBody = this.getResponseBody(response);
        if (!responseBody) {
            return null;
        }

        // 4. Buscar reflejo del script en diferentes contextos
        const reflection = this.findReflection(originalScript, responseBody);

        if (reflection.found) {
            return this.createFinding(
                xssPayload,
                response,
                endpoint,
                method,
                reflection
            );
        }

        return null;
    }

    /**
     * Busca el reflejo del XSS en la respuesta usando múltiples estrategias
     */
    private findReflection(
        originalScript: string,
        responseBody: string
    ): { found: boolean; context: string; evidence: string; confidence: number } {

        // Estrategia 1: El script exacto aparece en la respuesta
        if (responseBody.includes(originalScript)) {
            return {
                found: true,
                context: 'exact_match',
                evidence: originalScript,
                confidence: 100
            };
        }

        // Estrategia 2: Versiones codificadas/escapadas del script
        const variations = this.generateVariations(originalScript);
        for (const variation of variations) {
            if (responseBody.includes(variation)) {
                return {
                    found: true,
                    context: 'encoded_match',
                    evidence: variation,
                    confidence: 85
                };
            }
        }

        // Estrategia 3: Fragmentos del script (parciales)
        const fragments = this.extractFragments(originalScript);
        const foundFragments = fragments.filter(f => responseBody.includes(f));

        if (foundFragments.length >= 2) {
            return {
                found: true,
                context: 'partial_match',
                evidence: foundFragments.join(' | '),
                confidence: 70
            };
        }

        // Estrategia 4: Buscar patrones XSS en la respuesta
        const xssPatterns = [
            /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
            /on\w+\s*=\s*["'][^"']*?alert\([^)]*\)["']/gi,
            /javascript:alert\(/gi,
            /<img[\s\S]*?onerror=/gi,
            /<svg[\s\S]*?onload=/gi
        ];

        for (const pattern of xssPatterns) {
            const match = responseBody.match(pattern);
            if (match) {
                return {
                    found: true,
                    context: 'pattern_match',
                    evidence: match[0],
                    confidence: 60
                };
            }
        }

        return { found: false, context: '', evidence: '', confidence: 0 };
    }

    /**
     * Genera variaciones comunes del script (URL encode, HTML entities, etc.)
     */
    private generateVariations(script: string): string[] {
        const variations: string[] = [];

        // URL encoding
        variations.push(encodeURIComponent(script));
        variations.push(encodeURI(script));

        // HTML entities
        variations.push(script.replace(/</g, '&lt;').replace(/>/g, '&gt;'));

        // Double encoding
        variations.push(encodeURIComponent(encodeURIComponent(script)));

        // Unicode escapes
        variations.push(script.replace(/[<>]/g, (c) => {
            return c === '<' ? '\\u003c' : '\\u003e';
        }));

        // Hex encoding
        variations.push(this.toHexEncoding(script));

        return variations;
    }

    /**
     * Extrae fragmentos significativos del script
     */
    private extractFragments(script: string): string[] {
        const fragments: string[] = [];

        // Palabras clave típicas de XSS
        const keywords = ['script', 'alert', 'onerror', 'onload', 'javascript', 'prompt', 'confirm'];

        for (const keyword of keywords) {
            if (script.includes(keyword)) {
                fragments.push(keyword);
            }
        }

        // Extraer etiquetas HTML
        const tagMatches = script.match(/<[^>]+>/g);
        if (tagMatches) {
            fragments.push(...tagMatches);
        }

        // Extraer eventos
        const eventMatches = script.match(/on\w+\s*=/g);
        if (eventMatches) {
            fragments.push(...eventMatches);
        }

        return [...new Set(fragments)]; // Únicos
    }

    /**
     * Convierte a representación hex (ej: < -> %3c)
     */
    private toHexEncoding(text: string): string {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += '%' + text.charCodeAt(i).toString(16);
        }
        return result;
    }

    /**
     * Obtiene el body de la respuesta (string)
     */
    private getResponseBody(response: FuzzerResponse): string | null {
        // Si la respuesta tiene el body en algún campo conocido
        // Asumo que el body está en response['body'] o similar
        // Ajusta según tu estructura real

        // Por ahora, como no veo body en la estructura, asumimos que
        // el payload decodificado podría ser la respuesta o buscamos
        // en otros campos

        if (response.payload) {
            return this.decodeBase64(response.payload);
        }
        /**

        // Intento obtener de alguna propiedad común
        const possibleBody = (response as any).body ||
            (response as any).data ||
            (response as any).responseBody;

        if (possibleBody) {
            if (typeof possibleBody === 'string') {
                return possibleBody.substring(0, this.MAX_BODY_SIZE);
            }
            return JSON.stringify(possibleBody).substring(0, this.MAX_BODY_SIZE);
        }
             */

        // Si no encontramos body, usamos el payload como fallback?
        // Mejor no asumir y retornar null
        return null;
    }

    /**
     * Decodifica base64 a string
     */
    private decodeBase64(encoded: string): string | null {
        try {
            return Buffer.from(encoded, 'base64').toString('utf-8');
        } catch {
            try {
                return atob(encoded);
            } catch {
                return null;
            }
        }
    }

    /**
     * Crea el finding de seguridad
     */
    private createFinding(
        xssPayload: Vector,
        response: FuzzerResponse,
        endpoint: string,
        method: string,
        reflection: { context: string; evidence: string; confidence: number }
    ): SecurityValidation {

        // Calcular severidad basada en confianza y contexto
        const severity = this.calculateSeverity(reflection.confidence, response.statusCode);

        // Construir indicadores
        const indicators = [
            `Payload reflected in response (${reflection.context})`,
            `Trust: ${reflection.confidence}%`,
            `Status code: ${response.statusCode}`,
            `Technique: ${xssPayload.technique}`,
            `Original context: ${xssPayload.context}`
        ];

        if (response.statusCode === 200 || response.statusCode === 201) {
            indicators.push('Payload accepted by the server.');
        }

        return {
            type: 'SECURITY_VALIDATION',
            category: 'XSS',
            subcategory: 'Reflected XSS',
            severity,
            title: `Reflected XSS: ${xssPayload.description}`,
            description: `Detected reflection of XSS payload in the response. Reflection context: ${reflection.context}. The original payload was: ${this.decodeBase64(xssPayload.script)}`,
            evidence: {
                endpoint,
                method,
                payload: xssPayload,
                response: {
                    statusCode: response.statusCode,
                    headers: response.headers,
                    body: this.getResponseBody(response),
                    time: response.timings?.phases?.total || 0
                },
                indicators,
                requestId: response.uuidReq as UUID,
                timestamp: response.time
            },
            remediation: [
                'Implement entry sanitization for all fields that accept user data.',
                'Use contextual escaping (HTML escape, JavaScript escape, etc.)',
                'Configure appropriate Content-Security-Policy headers.',
                'Set Content-Type: application/json for API responses.',
                'Validate that responses do not contain executable code.',
                'Consider using a framework with built-in XSS protection.'
            ],
            cwe: 'CWE-79',
            owasp: xssPayload.owasp_category || 'A03:2021-Injection',
            confidence: reflection.confidence,
            metadata: {
                detector: 'ReflectedXSSDetector',
                patternId: `XSS-${xssPayload.id}`,
                references: [
                    'https://owasp.org/www-community/attacks/xss/',
                    'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html'
                ],
                tags: xssPayload.tags.split(',').map(t => t.trim()),
                technique: xssPayload.technique,
                browserSpecific: xssPayload.browser_specific
            }
        };
    }

    /**
     * Calcula la severidad basada en confianza y código de estado
     */
    private calculateSeverity(confidence: number, statusCode: number): SeverityLevel {
        // Si es 200 o 201 y alta confianza → CRITICAL
        if ((statusCode === 200 || statusCode === 201) && confidence >= 80) {
            return 'CRITICAL';
        }

        // Si es alta confianza pero otro status → HIGH
        if (confidence >= 80) {
            return 'HIGH';
        }

        // Confianza media → MEDIUM
        if (confidence >= 60) {
            return 'MEDIUM';
        }

        // Baja confianza → LOW
        return 'LOW';
    }
}


export interface SecurityValidation {
    type: 'SECURITY_VALIDATION';
    category: string;
    subcategory: string;
    severity: SeverityLevel;
    title: string;
    description: string;
    evidence: SecurityEvidence;
    remediation: string[];
    cwe?: string;
    owasp?: string;
    confidence: number;
    metadata: Record<string, any>;
}