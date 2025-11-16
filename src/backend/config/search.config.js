/**
 * Search Engine Configuration
 * Supports: Lunr (default), Elasticsearch, Meilisearch, Solr
 */

const config = {
  // Search engine to use: 'lunr', 'elasticsearch', 'meilisearch', 'solr'
  engine: process.env.SEARCH_ENGINE || 'lunr',
  
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
  
  // Elasticsearch configuration
  elasticsearch: {
    host: process.env.ELASTICSEARCH_HOST || 'http://localhost:9200',
    index: process.env.ELASTICSEARCH_INDEX || 'faq_index',
    auth: {
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD
    }
  },
  
  // Meilisearch configuration
  meilisearch: {
    host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
    apiKey: process.env.MEILISEARCH_API_KEY,
    index: process.env.MEILISEARCH_INDEX || 'faqs'
  },
  
  // Solr configuration
  solr: {
    host: process.env.SOLR_HOST || 'http://localhost:8983/solr',
    core: process.env.SOLR_CORE || 'faq_core'
  },
  
  // Field weights for relevance scoring
  fieldWeights: {
    question: parseFloat(process.env.SEARCH_QUESTION_WEIGHT) || 10,
    answer: parseFloat(process.env.SEARCH_ANSWER_WEIGHT) || 1,
    tags: parseFloat(process.env.SEARCH_TAGS_WEIGHT) || 5
  }
};

module.exports = config;
