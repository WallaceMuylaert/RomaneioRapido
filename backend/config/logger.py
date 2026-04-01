import os
import logging
from logging.handlers import TimedRotatingFileHandler
import portalocker
import inspect
from datetime import datetime, timedelta

class SafeDailyRotatingFileHandler(TimedRotatingFileHandler):
    """
    Handler que garante:
      - arquivo diário com data no nome (ex: main_2025-11-04.log)
      - troca automática no início do novo dia (mesmo com processo long-running)
      - lock via portalocker para escrita segura entre processos
    """
    def __init__(self, filename, when='midnight', interval=1, backupCount=120,
                 encoding=None, delay=False, utc=False, atTime=None):
        self._base_filename = filename
        self.current_date = datetime.now().strftime("%Y-%m-%d")
        dated = self._dated_filename(self.current_date)
        super().__init__(dated, when=when, interval=interval,
                         backupCount=backupCount, encoding=encoding,
                         delay=delay, utc=utc, atTime=atTime)
        self.lock_file = f"{self.baseFilename}.lock"

    def _dated_filename(self, date_str):
        base, ext = os.path.splitext(self._base_filename)
        return f"{base}_{date_str}{ext}"

    def _switch_if_needed(self):
        """Se o dia mudou, fecha stream e abre novo arquivo com nova data."""
        today = datetime.now().strftime("%Y-%m-%d")
        if today != self.current_date:
            try:
                if self.stream:
                    self.stream.close()
            except Exception:
                pass
            
            self.current_date = today
            new_name = self._dated_filename(self.current_date)
            self.baseFilename = new_name
            self.stream = self._open()
            self.lock_file = f"{self.baseFilename}.lock"
            
            t = datetime.now()
            tomorrow = (t + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            self.rolloverAt = int(tomorrow.timestamp())

    def emit(self, record):
        try:
            self._switch_if_needed()
            with portalocker.Lock(self.lock_file, 'a', timeout=10):
                super().emit(record)
                self.flush()  # Garante que os dados saiam do buffer do Python para o disco antes de liberar o lock
        except Exception:
            self.handleError(record)


_LOGGERS = {}

def _ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)

def get_logger(module_name: str = None, context: str = "default", base_folder: str = ".log",
               filename: str = None, level=logging.INFO):
    """
    Retorna um logger único por (context, module_name).
    - module_name: normalmente __name__
    - context: 'main', 'api', ou outro valor descritivo
    """
    if module_name is None:
        caller = inspect.stack()[1]
        module_name = caller.frame.f_globals.get("__name__", "unknown")

    key = f"{context}.{module_name}"

    if key in _LOGGERS:
        return _LOGGERS[key]

    log_dir = os.path.join(base_folder, context)
    _ensure_dir(log_dir)
    if not filename:
        filename = f"{context}.log"
    log_file = os.path.join(log_dir, filename)

    logger = logging.getLogger(key)
    logger.setLevel(level)
    logger.propagate = False

    if not logger.handlers:
        handler = SafeDailyRotatingFileHandler(
            filename=log_file,
            when='midnight',
            interval=1,
            backupCount=120,
            encoding='utf-8'
        )
        formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - [%(name)s] - %(message)s',
            datefmt='%d-%m-%y %H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    _LOGGERS[key] = logger
    return logger


def get_dynamic_logger(context: str = "default", level=logging.INFO):
    """
    Conveniência: detecta o módulo chamador e retorna um logger contextualizado.
    Uso: logger = get_dynamic_logger("api")  ou get_dynamic_logger("main")
    """
    caller = inspect.stack()[1]
    module_name = caller.frame.f_globals.get("__name__", "unknown")
    return get_logger(module_name=module_name, context=context, level=level)
