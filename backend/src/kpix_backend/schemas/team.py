import uuid

from pydantic import BaseModel, ConfigDict


class TeamCreate(BaseModel):
    name: str


class TeamPublic(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class TeamMemberPublic(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    user_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)
