# Run only against the disposable MySQL/Docker validation stack from fresh-rbac.compose.yml.
import json, urllib.error, urllib.request

BASE = 'http://127.0.0.1:13082/api'

def call(path, body=None, token=None, expected=200):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    request = urllib.request.Request(
        BASE + path,
        data=None if body is None else json.dumps(body).encode(),
        headers=headers,
        method='GET' if body is None else 'POST',
    )
    try:
        with urllib.request.urlopen(request) as response:
            status, payload = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, payload = error.code, error.read()
    assert status == expected, (path, status, payload.decode())
    return json.loads(payload) if payload else None

credentials = {'email': 'admin@rbac.test', 'password': 'Disposable-Rbac-Admin-2026!'}
first = call('/auth/login', credentials)
call('/auth/me', token=first['accessToken'])
rotated = call('/auth/refresh', {'refreshToken': first['refreshToken']})
call('/auth/refresh', {'refreshToken': first['refreshToken']}, expected=401)
call('/auth/me', token=rotated['accessToken'])
call('/auth/logout', {'refreshToken': rotated['refreshToken']}, rotated['accessToken'])
call('/auth/me', token=rotated['accessToken'], expected=401)
call('/auth/refresh', {'refreshToken': rotated['refreshToken']}, expected=401)
print(json.dumps({'login': True, 'me': True, 'refresh_rotation': True, 'old_refresh_rejected': True, 'logout_revokes_session': True}))
