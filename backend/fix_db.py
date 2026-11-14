from app.database import Base, engine
from app.models.company import Company
from app.models.filing import Filing
from app.models.chunk import Chunk
from app.models.chat_history import ChatHistory
from app.models.invoice import Invoice, LineItem

Base.metadata.create_all(bind=engine)
print("All tables created directly!")