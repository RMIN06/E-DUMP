import asyncio
from unittest.mock import AsyncMock, call

import pytest

from app.services import reminder_service


async def test_timer_checks_on_startup_and_retries_failures_next_minute(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sweep = AsyncMock(side_effect=[RuntimeError("synthetic database outage"), None])
    sleep = AsyncMock(side_effect=[None, asyncio.CancelledError()])
    monkeypatch.setattr(reminder_service, "sweep", sweep)
    monkeypatch.setattr(reminder_service.asyncio, "sleep", sleep)
    database, client = AsyncMock(), AsyncMock()
    with pytest.raises(asyncio.CancelledError):
        await reminder_service.run(database, client)
    assert sweep.await_args_list == [call(database, client), call(database, client)]
    assert sleep.await_args_list == [call(60), call(60)]
