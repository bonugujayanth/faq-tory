# Search Engine Configuration Guide

This guide covers the configurable search engine infrastructure supporting multiple search backends and relevance algorithms.

## Table of Contents

1. [Overview](#overview)
2. [Supported Search Engines](#supported-search-engines)
3. [Relevance Algorithms](#relevance-algorithms)
4. [Configuration](#configuration)
5. [API Usage](#api-usage)
6. [Performance Tuning](#performance-tuning)
7. [Troubleshooting](#troubleshooting)

## Overview

The application supports four search engines with configurable relevance algorithms:

- **Lunr.js** (default) - In-memory, zero-configuration JavaScript search
- **Elasticsearch** - Distributed, RESTful search and analytics engine
- **Meilisearch** - Fast, typo-tolerant search engine
- **Apache Solr** - Enterprise search platform

## Supported Search Engines

### Lunr.js (Default)

**Advantages:**
- No external dependencies or services required
- Zero configuration setup
- Fast for small to medium datasets (< 10,000 documents)
- Perfect for development and testing

**Disadvantages:**
- In-memory only (no persistence)
- Limited scalability for large datasets
- Single-threaded performance

**Setup:**
```bash
# No additional setup required
# Already included in package.json
```

### Elasticsearch

**Advantages:**
- Distributed and horizontally scalable
- Advanced full-text search capabilities
- Real-time analytics
- Production-ready with high availability

**Disadvantages:**
- Resource intensive (requires significant memory/CPU)
- Complex setup and configuration
- Requires separate service

**Setup:**
```bash
# Install Elasticsearch client
npm install @elastic/elasticsearch

# Run Elasticsearch (Docker)
docker run -d -p 9200:9200 -e "discovery.type=single-node" elasticsearch:8.11.0

# Configure environment variables
SEARCH_ENGINE=elasticsearch
ELASTICSEARCH_HOST=http://localhost:9200
ELASTICSEARCH_INDEX=faq_index
```

### Meilisearch

**Advantages:**
- Extremely fast search (< 50ms typical)
- Typo-tolerant out of the box
- Simple API and easy setup
- Low resource consumption

**Disadvantages:**
- Newer and less mature than Elasticsearch/Solr
- Limited advanced features
- Smaller community

**Setup:**
```bash
# Install Meilisearch client
npm install meilisearch

# Run Meilisearch (Docker)
docker run -d -p 7700:7700 getmeili/meilisearch:latest

# Configure environment variables
SEARCH_ENGINE=meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_INDEX=faqs
MEILISEARCH_API_KEY=your_master_key
```

### Apache Solr

**Advantages:**
- Mature and battle-tested
- Rich feature set (faceting, highlighting, spatial search)
- Excellent documentation
- Strong Java ecosystem integration

**Disadvantages:**
- Java-based (requires JVM)
- More complex than Meilisearch
- Steeper learning curve

**Setup:**
```bash
# Install Solr client
npm install solr-client

# Run Solr (Docker)
docker run -d -p 8983:8983 solr:9.4 solr-precreate faq_core

# Configure environment variables
SEARCH_ENGINE=solr
SOLR_HOST=http://localhost:8983/solr
SOLR_CORE=faq_core
```

## Relevance Algorithms

### BM25 (Okapi BM25) - Default

**Best for:** General purpose, varied document lengths

BM25 is a probabilistic ranking function that considers:
- Term frequency saturation (k1 parameter)
- Document length normalization (b parameter)

**Parameters:**
```bash
SEARCH_RELEVANCE_ALGORITHM=bm25
SEARCH_BM25_K1=1.2    # Term frequency saturation (1.2-2.0 typical)
SEARCH_BM25_B=0.75    # Length normalization (0-1, higher = more normalization)
```

**Tuning k1:**
- Lower (1.0-1.2): Less emphasis on term frequency
- Higher (1.8-2.0): More emphasis on term frequency
- Default (1.2): Balanced approach

**Tuning b:**
- 0: No length normalization (favors longer documents)
- 0.5: Moderate normalization
- 0.75: Standard normalization (default)
- 1.0: Maximum normalization (heavily penalizes long documents)

### TF-IDF (Term Frequency-Inverse Document Frequency)

**Best for:** Classic information retrieval, academic use cases

TF-IDF measures term importance by:
- How often a term appears in a document (TF)
- How rare the term is across all documents (IDF)

**Configuration:**
```bash
SEARCH_RELEVANCE_ALGORITHM=tfidf
```

**Comparison:**
| Aspect | BM25 | TF-IDF |
|--------|------|--------|
| Term frequency saturation | Yes | No |
| Length normalization | Yes (configurable) | Yes (fixed) |
| Performance | Slightly faster | Fast |
| Best for | Modern search | Classic IR |

## Configuration

### Environment Variables

Create a `.env` file in `src/backend/`:

```bash
# Search Engine Selection
SEARCH_ENGINE=lunr                    # lunr, elasticsearch, meilisearch, solr

# Relevance Algorithm
SEARCH_RELEVANCE_ALGORITHM=bm25       # bm25, tfidf

# BM25 Parameters
SEARCH_BM25_K1=1.2                    # Default: 1.2
SEARCH_BM25_B=0.75                    # Default: 0.75

# Field Weights (Boost Factors)
SEARCH_QUESTION_WEIGHT=10             # Default: 10
SEARCH_ANSWER_WEIGHT=1                # Default: 1
SEARCH_TAGS_WEIGHT=5                  # Default: 5

# Elasticsearch Configuration
ELASTICSEARCH_HOST=http://localhost:9200
ELASTICSEARCH_INDEX=faq_index
ELASTICSEARCH_USERNAME=elastic         # Optional
ELASTICSEARCH_PASSWORD=changeme        # Optional

# Meilisearch Configuration
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_INDEX=faqs
MEILISEARCH_API_KEY=your_master_key   # Optional

# Solr Configuration
SOLR_HOST=http://localhost:8983/solr
SOLR_CORE=faq_core
```

### Field Weights

Field weights control relevance boosting:

```bash
# Questions are 10x more important than answers
SEARCH_QUESTION_WEIGHT=10

# Answers have baseline importance
SEARCH_ANSWER_WEIGHT=1

# Tags are 5x more important than answers
SEARCH_TAGS_WEIGHT=5
```

**Recommendations:**
- **FAQ/Documentation:** Question (10), Answer (1), Tags (5)
- **Product Search:** Title (10), Description (3), Tags (7)
- **Blog Search:** Title (8), Content (1), Tags (4)

## API Usage

### Basic Search

```bash
GET /api/search?q=configuration
```

Response:
```json
{
  "success": true,
  "results": [
    {
      "id": 1,
      "question": "How to configure search engines?",
      "answer": "You can use Lunr, Elasticsearch, Meilisearch, or Solr",
      "tags": ["configuration", "search"],
      "score": 2.45,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ],
  "count": 1
}
```

### Filter by Tags

```bash
# Single tag
GET /api/search?q=search&tags=configuration

# Multiple tags (comma-separated)
GET /api/search?q=search&tags=configuration,tutorial

# Multiple tags (array)
GET /api/search?q=search&tags[]=configuration&tags[]=tutorial
```

### Filter by Date Range

```bash
# Created date range
GET /api/search?q=search&startDate=2024-01-01&endDate=2024-12-31

# Updated date range
GET /api/search?q=search&updatedStart=2024-01-01&updatedEnd=2024-12-31

# Legacy parameter names (backward compatible)
GET /api/search?q=search&createdAfter=2024-01-01&createdBefore=2024-12-31
```

### Combined Filters

```bash
GET /api/search?q=configure&tags=search&startDate=2024-01-01&endDate=2024-12-31
```

### Health Check

```bash
GET /api/search/health
```

Response:
```json
{
  "ok": true,
  "engine": "lunr",
  "algorithm": "bm25",
  "documentCount": 150,
  "message": "Search engine is healthy"
}
```

## Performance Tuning

### Lunr.js

**Optimization Tips:**
1. Rebuild index periodically (not on every document change)
2. Limit document size (< 10,000 docs recommended)
3. Use field weights to prioritize important fields
4. Consider pagination for large result sets

**Memory Usage:**
- ~100 KB per 100 documents (approximate)
- Monitor with `process.memoryUsage()`

### Elasticsearch

**Optimization Tips:**
1. Use appropriate shard count (start with 1-2 for small datasets)
2. Configure heap size (50% of available RAM, max 32GB)
3. Use filters instead of queries when possible
4. Enable query caching for frequent searches

**Configuration:**
```bash
# elasticsearch.yml
indices.memory.index_buffer_size: 10%
indices.queries.cache.size: 10%
```

### Meilisearch

**Optimization Tips:**
1. Limit searchable attributes (fewer = faster)
2. Configure ranking rules appropriately
3. Use filters for faceting
4. Enable typo tolerance selectively

**Configuration:**
```javascript
await index.updateSettings({
  searchableAttributes: ['question', 'answer'],
  rankingRules: ['words', 'typo', 'proximity']
});
```

### Apache Solr

**Optimization Tips:**
1. Use appropriate commit strategies
2. Configure cache sizes (filterCache, queryResultCache)
3. Use field type optimization (text_general vs text_en)
4. Enable soft commits for near-real-time search

**Configuration:**
```xml
<autoCommit>
  <maxTime>15000</maxTime>
  <openSearcher>false</openSearcher>
</autoCommit>
```

## Troubleshooting

### Lunr.js

**Problem:** Search index not initialized
```
Solution: Ensure SearchIndex.initialize() is called on server startup
```

**Problem:** Memory issues with large datasets
```
Solution: Switch to Elasticsearch or Meilisearch for datasets > 10,000 docs
```

### Elasticsearch

**Problem:** Connection refused
```bash
# Check if Elasticsearch is running
curl http://localhost:9200

# Check logs
docker logs <container_id>
```

**Problem:** Out of memory
```bash
# Increase heap size
docker run -e "ES_JAVA_OPTS=-Xms2g -Xmx2g" elasticsearch:8.11.0
```

### Meilisearch

**Problem:** API key authentication failed
```bash
# Check master key
curl http://localhost:7700/health

# Regenerate keys if needed
```

**Problem:** Index not found
```bash
# List all indexes
curl http://localhost:7700/indexes

# Create index manually if needed
```

### Apache Solr

**Problem:** Core not found
```bash
# List cores
curl http://localhost:8983/solr/admin/cores?action=STATUS

# Create core
docker exec <container> solr create_core -c faq_core
```

**Problem:** Schema field missing
```bash
# Add field to schema
curl -X POST http://localhost:8983/solr/faq_core/schema \
  -H 'Content-type:application/json' \
  -d '{
    "add-field": {
      "name": "tags",
      "type": "string",
      "multiValued": true
    }
  }'
```

## Testing

Run comprehensive search tests:

```bash
# Run all tests
npm test

# Run only search tests
npm test -- search.api.comprehensive.test.js

# Run with coverage
npm test -- --coverage
```

Test coverage includes:
- ✅ Basic search functionality
- ✅ Tag filtering (single and multiple)
- ✅ Date range filtering
- ✅ Combined filters
- ✅ Relevance scoring
- ✅ Search highlighting
- ✅ Edge cases (empty queries, invalid dates, etc.)
- ✅ Health checks
- ✅ Index management (add/update/remove)

## Migration Guide

### Switching Search Engines

1. **Install required package:**
```bash
npm install @elastic/elasticsearch  # For Elasticsearch
npm install meilisearch             # For Meilisearch
npm install solr-client             # For Solr
```

2. **Update environment variables:**
```bash
SEARCH_ENGINE=elasticsearch  # or meilisearch, solr
```

3. **Restart server:**
```bash
npm restart
```

4. **Verify health:**
```bash
curl http://localhost:3000/api/search/health
```

### Changing Relevance Algorithm

```bash
# Switch to TF-IDF
SEARCH_RELEVANCE_ALGORITHM=tfidf

# Or back to BM25 with custom parameters
SEARCH_RELEVANCE_ALGORITHM=bm25
SEARCH_BM25_K1=1.5
SEARCH_BM25_B=0.8
```

No data migration required - changes take effect immediately.

## Best Practices

1. **Start Simple:** Use Lunr.js for development, upgrade to Elasticsearch/Meilisearch for production
2. **Tune Incrementally:** Adjust one parameter at a time and measure impact
3. **Monitor Performance:** Track search latency and relevance metrics
4. **Test Thoroughly:** Use comprehensive test suite before deploying configuration changes
5. **Document Changes:** Keep track of parameter tuning and results
6. **Backup Configuration:** Store `.env` in version control (excluding secrets)

## Support

For issues or questions:
- Check [Troubleshooting](#troubleshooting) section
- Review test suite in `tests/search.api.comprehensive.test.js`
- Consult official documentation:
  - [Lunr.js](https://lunrjs.com/)
  - [Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
  - [Meilisearch](https://docs.meilisearch.com/)
  - [Apache Solr](https://solr.apache.org/guide/)
