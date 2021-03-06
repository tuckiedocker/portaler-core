import { DateTime } from 'luxon'
import { useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'

import { Zone } from '@portaler/types'

import useConfigSelector from '../../common/hooks/useConfigSelector'
import { ErrorActionTypes } from '../../reducers/errorReducer'
import {
  ZoneAction,
  ZoneActionTypes,
  ZoneState,
} from '../../reducers/zoneReducer'

const zoneStorage = (): ZoneState | null => {
  // TODO leave this off for a week or so
  const zonesString: string | null = null // window.localStorage.getItem('zones')

  if (zonesString) {
    const zoneState: ZoneState = JSON.parse(zonesString)
    const now = DateTime.utc()
    const lastUpdated = DateTime.fromMillis(zoneState.lastUpdated)

    if (now.weekday !== 1 && now.diff(lastUpdated, 'days').as('days') < 3) {
      return zoneState
    }
  }

  return null
}

const useGetZones = () => {
  const hasHydrated = useRef<boolean>(false)
  const dispatch = useDispatch()
  const config = useConfigSelector()

  useEffect(() => {
    const loadedState = zoneStorage()

    if (loadedState && !hasHydrated.current) {
      hasHydrated.current = true

      dispatch<ZoneAction>({
        type: ZoneActionTypes.HYDRATE,
        fullState: loadedState,
      })
    } else if (!loadedState && (config.token || config.isPublic)) {
      hasHydrated.current = true
      const headers = new Headers()

      if (config.token) {
        headers.set('Authorization', `Bearer ${config.token}`)
      }

      fetch(`/api/zone/list`, {
        headers,
      })
        .then((r) => {
          if (!r.ok) {
            throw new Error('Unable to fetch zones')
          }

          return r.json()
        })
        .then((json) => {
          dispatch({ type: ZoneActionTypes.ADD, zones: json as Zone[] })
        })
        .catch((err: Error) => {
          dispatch({ type: ErrorActionTypes.ADD, error: err.message })
        })
    }
  }, [dispatch, config])
}

export default useGetZones
