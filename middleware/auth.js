module.exports = {
    isAuthenticated: (req, res, next) => {
        if (req.session && req.session.user) {
            return next();
        }
        res.redirect('/auth');
    },
    isGuest: (req, res, next) => {
        if (req.session && req.session.user) {
            return res.redirect('/');
        }
        next();
    }
};
