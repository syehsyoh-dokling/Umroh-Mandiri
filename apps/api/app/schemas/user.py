from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str | None = None
    role: str = "user"
    referral_code: str | None = None
    prov_id: str | None = None
    city_id: str | None = None
    dis_id: str | None = None
    desa_id: str | None = None
    ip_address: str | None = None
    device_location: str | None = None
    user_agent: str | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    prov_id: str | None = None
    city_id: str | None = None
    dis_id: str | None = None
    desa_id: str | None = None
    referral_code: str | None = None
    ip_address: str | None = None
    device_location: str | None = None
    user_agent: str | None = None
