import { ChatGroq } from '@langchain/groq';
import { KycIdSchema, KycSelfieSchema } from '../schemas.js';
import { createError } from '../error-codes.js';
import { kycValidatorService } from './kycValidatorService.js';

/**
 * LLM Service for handling all AI-related operations
 * Centralized service for managing LLM interactions, structured output, and error handling
 */
class LLMService {
  constructor() {
    this.llm = null;
    this.structuredIdLLM = null;
    this.structuredSelfieLLM = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the LLM service with Groq configuration
   */
  initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize base LLM
      this.llm = new ChatGroq({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.1,
        maxTokens: 1000,
        apiKey: process.env.GROQ_API_KEY
      });

      // Create structured LLMs with Zod schemas
      this.structuredIdLLM = this.llm.withStructuredOutput(KycIdSchema, {
        name: "kyc_id_verification"
      });

      this.structuredSelfieLLM = this.llm.withStructuredOutput(KycSelfieSchema, {
        name: "kyc_selfie_verification"
      });

      this.isInitialized = true;
      console.log('✅ LLM Service initialized with Llama 4 Scout (17Bx16E)');
    } catch (error) {
      console.error('❌ Failed to initialize LLM Service:', error);
      throw new Error('LLM Service initialization failed');
    }
  }

  /**
   * Get the initialized LLM instance
   */
  getLLM() {
    this.ensureInitialized();
    return this.llm;
  }

  /**
   * Prepare image messages for VLM API
   * @param {Array} imageMessages - Array of image message objects with URLs
   * @returns {Array} Array of image objects ready for VLM
   */
  prepareImageMessages(imageMessages) {
    console.log(`🖼️ Preparing ${imageMessages.length} image(s) for VLM processing`);
    
    // TEMPORARY: Hardcoded test images for ID card verification (replace localhost URLs)
    // TODO: Remove this and use actual uploaded images once we have a public image hosting solution
    const testImages = [
      "https://media.istockphoto.com/id/814423752/photo/eye-of-model-with-colorful-art-make-up-close-up.jpg?s=612x612&w=0&k=20&c=l15OdMWjgCKycMMShP8UK94ELVlEGvt7GmB_esHWPYE=",
      "https://images.unsplash.com/photo-1526779259212-939e64788e3c?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8ZnJlZSUyMGltYWdlc3xlbnwwfHwwfHx8MA%3D%3D"
    ];
    
    // Use test images instead of uploaded images for now
    return testImages.map(url => ({
      type: "image_url",
      image_url: {
        url: url
      }
    }));
  }

  /**
   * Get the structured ID verification LLM
   */
  getStructuredIdLLM() {
    this.ensureInitialized();
    return this.structuredIdLLM;
  }

  /**
   * Get the structured selfie verification LLM
   */
  getStructuredSelfieLLM() {
    this.ensureInitialized();
    return this.structuredSelfieLLM;
  }

  /**
   * Verify ID document using structured output with validation
   * @param {ChatPromptTemplate} promptTemplate - The prompt template to use
   * @param {Array} imageMessages - Array of image message objects
   * @returns {Promise<Object>} Structured ID verification result
   */
  async verifyIdDocument(promptTemplate, imageMessages) {
    try {
      this.ensureInitialized();

      // Prepare image messages for VLM (direct URLs, no base64 conversion)
      const vlmImages = this.prepareImageMessages(imageMessages);

      // Format the prompt template to get the base messages
      const baseMessages = await promptTemplate.formatMessages({});
      
      // Create VLM-compatible message format
      const systemMessage = {
        role: "system",
        content: baseMessages[0].content
      };

      const humanMessage = {
        role: "user",
        content: [
          {
            type: "text",
            text: baseMessages[1].content
          },
          ...vlmImages
        ]
      };

      const messages = [systemMessage, humanMessage];
      
      const result = await this.structuredIdLLM.invoke(messages);
      
      // Perform validation
      const validation = this.validateIdData(result);
      
      console.log('✅ ID verification completed successfully');
      return {
        success: true,
        data: result,
        validation: validation
      };
    } catch (error) {
      console.error('❌ ID verification failed:', error);
      console.log('🔍 Error structure debug:', {
        hasError: !!error.error,
        hasFailedGeneration: !!error.error?.failed_generation,
        hasDirectFailedGeneration: !!error.failed_generation,
        errorKeys: Object.keys(error),
        errorErrorKeys: error.error ? Object.keys(error.error) : 'no error.error',
        fullError: JSON.stringify(error, null, 2)
      });
      
      // Check if it's a "wrong content" error from the LLM
      // Try multiple possible error structures
      const failedGeneration = error.error?.failed_generation || 
                              error.failed_generation || 
                              error.error?.error?.failed_generation;
      
      if (failedGeneration && 
          failedGeneration.includes('unable to extract information') &&
          failedGeneration.includes('do not contain any relevant data')) {
        console.log('🚫 Wrong content detected - not an ID card');
        return {
          success: false,
          error: createError('WRONG_CONTENT')
        };
      }
      
      // Also check for the specific error message pattern
      const errorMessage = error.message || error.error?.message || '';
      if (errorMessage.includes('Failed to call a function') && 
          errorMessage.includes('tool_use_failed')) {
        console.log('🚫 Tool use failed - likely wrong content');
        return {
          success: false,
          error: createError('WRONG_CONTENT')
        };
      }
      
      return {
        success: false,
        error: createError('GROQ_API_ERROR')
      };
    }
  }

  /**
   * Verify selfie using structured output with validation
   * @param {ChatPromptTemplate} promptTemplate - The prompt template to use
   * @param {Array} imageMessages - Array of image message objects
   * @returns {Promise<Object>} Structured selfie verification result
   */
  async verifySelfie(promptTemplate, imageMessages) {
    try {
      this.ensureInitialized();

      // Prepare image messages for VLM (direct URLs, no base64 conversion)
      const vlmImages = this.prepareImageMessages(imageMessages);

      // Format the prompt template to get the base messages
      const baseMessages = await promptTemplate.formatMessages({});
      
      // Create VLM-compatible message format
      const systemMessage = {
        role: "system",
        content: baseMessages[0].content
      };

      const humanMessage = {
        role: "user",
        content: [
          {
            type: "text",
            text: baseMessages[1].content
          },
          ...vlmImages
        ]
      };

      const messages = [systemMessage, humanMessage];
      
      const result = await this.structuredSelfieLLM.invoke(messages);
      
      // Perform validation
      const validation = this.validateSelfieData(result);
      
      console.log('✅ Selfie verification completed successfully');
      return {
        success: true,
        data: result,
        validation: validation
      };
    } catch (error) {
      console.error('❌ Selfie verification failed:', error);
      
      // Check if it's a "wrong content" error from the LLM
      // Try multiple possible error structures
      const failedGeneration = error.error?.failed_generation || 
                              error.failed_generation || 
                              error.error?.error?.failed_generation;
      
      if (failedGeneration && 
          failedGeneration.includes('unable to extract information') &&
          failedGeneration.includes('do not contain any relevant data')) {
        console.log('🚫 Wrong content detected - not a selfie');
        return {
          success: false,
          error: createError('WRONG_CONTENT')
        };
      }
      
      // Also check for the specific error message pattern
      const errorMessage = error.message || error.error?.message || '';
      if (errorMessage.includes('Failed to call a function') && 
          errorMessage.includes('tool_use_failed')) {
        console.log('🚫 Tool use failed - likely wrong content');
        return {
          success: false,
          error: createError('WRONG_CONTENT')
        };
      }
      
      return {
        success: false,
        error: createError('GROQ_API_ERROR')
      };
    }
  }

  /**
   * Generic method for any structured LLM operation
   * @param {Object} structuredLLM - The structured LLM to use
   * @param {ChatPromptTemplate} promptTemplate - The prompt template
   * @param {Object} variables - Variables for prompt formatting
   * @returns {Promise<Object>} Structured result
   */
  async executeStructuredOperation(structuredLLM, promptTemplate, variables = {}) {
    try {
      this.ensureInitialized();

      const messages = await promptTemplate.formatMessages(variables);
      const result = await structuredLLM.invoke(messages);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('❌ Structured operation failed:', error);
      return {
        success: false,
        error: createError('GROQ_API_ERROR')
      };
    }
  }

  /**
   * Check if the service is properly initialized
   */
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error('LLM Service not initialized. Call initialize() first.');
    }
  }

  /**
   * Get service status and configuration info
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      hasLLM: !!this.llm,
      hasStructuredIdLLM: !!this.structuredIdLLM,
      hasStructuredSelfieLLM: !!this.structuredSelfieLLM,
      model: this.llm?.model || null,
      temperature: this.llm?.temperature || null
    };
  }

  /**
   * Validate Turkish ID document data using KycValidator
   * @param {Object} data - The extracted ID data
   * @returns {Object} Validation result with errors
   */
  validateIdData(data) {
    return kycValidatorService.validateIdData(data);
  }
  
  /**
   * Validate selfie data using KycValidator
   * @param {Object} data - The extracted selfie data
   * @returns {Object} Validation result with errors
   */
  validateSelfieData(data) {
    return kycValidatorService.validateSelfieData(data);
  }
  

  /**
   * Reset the service (useful for testing or reconfiguration)
   */
  reset() {
    this.llm = null;
    this.structuredIdLLM = null;
    this.structuredSelfieLLM = null;
    this.isInitialized = false;
    console.log('🔄 LLM Service reset');
  }
}

// Create and export a singleton instance
const llmService = new LLMService();

export default llmService;

export { LLMService };
