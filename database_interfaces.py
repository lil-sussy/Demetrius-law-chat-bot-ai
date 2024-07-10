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
            
    def clear(self):
        # Clear the ChromaDB client
        for collection in self.client.list_collections():
            self.client.delete_collection(collection.name)

    def close(self):
        # Persist the data to ensure it is saved
        pass


from graphdatascience import GraphDataScience
from neo4j import GraphDatabase
from datetime import datetime

class FrenchLawDatabase:
    def __init__(self, uri, user, password):
        self.driver = GraphDataScience(uri, auth=(user, password))
        print(self.driver.version())

    def close(self):
        self.driver.close()

    def insert_article(self, law_number, date, title, code_name, article_number, text):
        query = """
        MERGE (law:Law {law_number: $law_number})
        ON CREATE SET law.date = $date, law.title = $title
        MERGE (code:Code {code_name: $code_name})
        MERGE (law)-[:LAW_TO_CODE]->(code)
        MERGE (article:Article {article_number: $article_number, code_name: $code_name})
        ON CREATE SET article.text = $text, article.law_number = $law_number
        MERGE (law)-[:LAW_CONTAINS]->(article)
        MERGE (code)-[:CODE_CONTAINS]->(article)
        """
        parameters = {
            "law_number": law_number,
            "date": date,
            "title": title,
            "code_name": code_name,
            "article_number": article_number,
            "text": text
        }
        
        self.driver.run_cypher(query, parameters)
        print(f"Article {article_number} of {code_name} inserted successfully.")


