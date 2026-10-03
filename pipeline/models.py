"""Pydantic schema for graph nodes/edges. Validated on export (CLAUDE.md rule 1)."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

EvidenceType = Literal["curated", "computed", "llm_extracted", "manual"]
Status = Literal["supported", "contradicted", "hypothesis"]


class Edge(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    source: str
    target: str
    relation: str
    evidence_type: EvidenceType
    source_db: str
    references: list[str]
    retrieved_at: str
    confidence: float = Field(ge=0, le=1)
    status: Status


class Node(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    type: Literal["disease", "gene", "phenotype", "mechanism", "publication", "investigator",
                  "study", "project", "patient_org", "asset"]
    name: str | None = None
