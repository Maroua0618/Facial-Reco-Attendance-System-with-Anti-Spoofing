from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from config import supabase
from services.auth import require_auth


router = APIRouter()


class SessionCreateRequest(BaseModel):
    module_id: str
    group_id: str
    session_date: str
    start_time: str
    session_type: Literal['lecture', 'td', 'tp', 'exam'] = 'lecture'
    week: int = Field(ge=1, le=14)


@router.post('/sessions')
async def create_session(payload: SessionCreateRequest, user: dict = Depends(require_auth)):
    # Use service-role client to bypass RLS
    service_client = supabase().schema('public')

    # Look up teacher by auth_user_id (more reliable than id)
    resp = service_client.table('teachers').select('id, role, auth_user_id').eq('auth_user_id', user['user_id']).execute()
    teacher_rows = resp.data or []
    if not teacher_rows:
        raise HTTPException(status_code=403, detail='Teacher profile not found')
    
    teacher = teacher_rows[0]
    teacher_id = teacher['id']
    is_admin = teacher.get('role') == 'admin'

    # Check if module exists
    module_resp = service_client.table('modules').select('id, lecturer_id').eq('id', payload.module_id).execute()
    module_rows = module_resp.data or []
    module = module_rows[0] if module_rows else None
    if not module:
        raise HTTPException(status_code=404, detail='Module not found')

    # Check authorization: admin, lecturer, or assigned teacher
    allowed = is_admin or module.get('lecturer_id') == teacher_id
    if not allowed:
        # Check if assigned as tutorial/lab instructor via module_groups
        assigned = (
            service_client.table('module_groups')
            .select('module_id')
            .eq('module_id', payload.module_id)
            .eq('assigned_teacher_id', teacher_id)
            .limit(1)
            .execute()
            .data
        )
        allowed = bool(assigned)

    if not allowed:
        raise HTTPException(status_code=403, detail='Not allowed to schedule sessions for this module')

    # Check if group is linked to module
    membership_resp = (
        service_client.table('module_groups')
        .select('module_id, group_id')
        .eq('module_id', payload.module_id)
        .eq('group_id', payload.group_id)
        .execute()
    )
    if not (membership_resp.data or []):
        raise HTTPException(status_code=400, detail='Selected group is not linked to this module')

    # Insert session using service role
    insert_resp = service_client.table('sessions').insert({
        'module_id': payload.module_id,
        'group_id': payload.group_id,
        'session_date': payload.session_date,
        'start_time': payload.start_time,
        'session_type': payload.session_type,
        'week': payload.week,
    }).execute()

    if not insert_resp.data:
        raise HTTPException(status_code=500, detail='Failed to create session')

    return {'ok': True, 'session': insert_resp.data[0]}