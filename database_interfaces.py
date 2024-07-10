# chroma_db_interface.py

import chromadb

class ChromaDBInterface:
    def __init__(self, db_path):
        # Initialize the ChromaDB client with the correct settings for persistence
        self.client = chromadb.PersistentClient(path=db_path)
        # Get or create the articles collection
        self.articles_collection = self.client.get_or_create_collection("articles")

    def store_article(self, document_name, article_number, content, embedding):
        # Add the article to the articles collection
        self.articles_collection.add(
            documents=[content],
            embeddings=[embedding],
            metadatas=[{"document": document_name, "article_number": article_number}],
            ids=[f"{document_name}_{article_number}"]
        )

    def store_keywords(self, document_name, article_number, keywords):
        # Create or get the keywords collection for the specific document
        keywords_collection_name = f"{document_name}_keywords"
        keywords_collection = self.client.get_or_create_collection(keywords_collection_name)
        for i, keyword in enumerate(keywords):
            # Add each keyword to the keywords collection
            keywords_collection.add(
                documents=[keyword],
                metadatas=[{"document": document_name, "article_number": article_number}],
                ids=[f"{document_name}_{article_number}_kw{i}"]
            )

    def close(self):
        # Persist the data to ensure it is saved
        pass


from graphdatascience import GraphDataScience

class Neo4jInterface:
    def __init__(self, uri, user, password):
        # Initialize the GraphDataScience client with the Neo4j connection details
        self.gds = GraphDataScience(uri, auth=(user, password))

    def store_article(self, document_name, article_number, content):
        # Store the article in the Neo4j database
        self.gds.run_cypher("""
            MERGE (d:Document {name: $document_name})
            CREATE (a:Article {number: $article_number, content: $content})
            CREATE (d)-[:CONTAINS]->(a)
        """, params={"document_name": document_name, "article_number": article_number, "content": content})

    def close(self):
        # Close the GraphDataScience client connection
        self.gds.close()
