/**
 * Simple test for JSON parsing in summarization service
 */

// Test the JSON parsing logic directly
function testJSONParsing() {
  console.log('Testing JSON parsing logic...\n');
  
  // Test case 1: Clean JSON
  const cleanJSON = `{
    "executiveSummary": "This is a test summary",
    "keyPoints": ["Point 1", "Point 2", "Point 3"]
  }`;
  
  // Test case 2: JSON wrapped in text
  const wrappedJSON = `Here is the comprehensive summary of the conversation transcript in the requested JSON format:

{
  "executiveSummary": "The conversation revolves around project status meeting",
  "keyPoints": ["Development team is 80% complete", "API integration issues", "Timeline adjusted"]
}

This completes the analysis.`;
  
  // Test case 3: Malformed JSON
  const malformedJSON = `Here is the summary:
  - Development team is 80% complete with new feature rollout
  - User authentication module fully implemented
  - API integration issue causing delays`;
  
  function parseSummaryResponse(summaryText) {
    try {
      // Clean the response - remove any text before and after JSON
      let cleanedText = summaryText.trim();
      
      // Find JSON block if wrapped in text
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }
      
      // Try to parse as JSON
      const parsed = JSON.parse(cleanedText);
      
      return {
        success: true,
        executiveSummary: parsed.executiveSummary || 'Summary not available',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : []
      };
    } catch (parseError) {
      // Fallback: parse text response manually
      const lines = summaryText.split('\n').filter(line => line.trim());
      
      let executiveSummary = "Conversation analysis completed using text parsing.";
      const summaryMatch = summaryText.match(/(?:executive|summary|overview):\s*["']?([^"'\n]+)/i);
      if (summaryMatch) {
        executiveSummary = summaryMatch[1];
      } else if (lines.length > 0) {
        executiveSummary = lines[0].replace(/^[-*•"'\s]*/, '').substring(0, 200);
      }
      
      const keyPointsRegex = /^[-*•]\s*(.+)|^\d+\.\s*(.+)/;
      const keyPoints = lines
        .filter(line => keyPointsRegex.test(line))
        .map(line => line.replace(keyPointsRegex, '$1$2').trim())
        .slice(0, 5);
      
      return {
        success: false,
        executiveSummary: executiveSummary,
        keyPoints: keyPoints.length > 0 ? keyPoints : ["Key points extracted from text"]
      };
    }
  }
  
  // Test all cases
  console.log('Test 1 - Clean JSON:');
  console.log(JSON.stringify(parseSummaryResponse(cleanJSON), null, 2));
  console.log('\n');
  
  console.log('Test 2 - Wrapped JSON:');
  console.log(JSON.stringify(parseSummaryResponse(wrappedJSON), null, 2));
  console.log('\n');
  
  console.log('Test 3 - Malformed JSON (fallback):');
  console.log(JSON.stringify(parseSummaryResponse(malformedJSON), null, 2));
}

testJSONParsing();