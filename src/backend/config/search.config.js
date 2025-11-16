/**
 * Search Engine Configuration
 * Supports: Lunr with BM25 and TF-IDF algorithms
 */

const config = {
  // Relevance algorithm: 'tfidf', 'bm25'
  relevanceAlgorithm: process.env.SEARCH_RELEVANCE_ALGORITHM || 'bm25',
  
  // BM25 parameters
  bm25: {
    k1: parseFloat(process.env.SEARCH_BM25_K1) || 1.2,  // Term frequency saturation
    b: parseFloat(process.env.SEARCH_BM25_B) || 0.75     // Length normalization
  },
  
  // TF-IDF parameters
  tfidf: {
    useIdf: true,
    normalization: 'cosine'  // 'cosine', 'none', 'l2'
  },
  
  // Field weights for relevance scoring
  fieldWeights: {
    question: parseFloat(process.env.SEARCH_QUESTION_WEIGHT) || 10,
    answer: parseFloat(process.env.SEARCH_ANSWER_WEIGHT) || 1,
    tags: parseFloat(process.env.SEARCH_TAGS_WEIGHT) || 5
  }
};

module.exports = config;
